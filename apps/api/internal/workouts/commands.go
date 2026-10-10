package workouts

import (
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"reflect"
	"time"
)

func latest(w *Workout) time.Time {
	t := w.StartedAt
	for _, x := range w.CurrentRevision.Exercises {
		for _, s := range x.Sets {
			if s.StartedAt != nil && s.StartedAt.After(t) {
				t = *s.StartedAt
			}
			if s.CompletedAt != nil && s.CompletedAt.After(t) {
				t = *s.CompletedAt
			}
		}
	}
	for _, r := range w.CurrentRevision.RestIntervals {
		if r.StartedAt.After(t) {
			t = r.StartedAt
		}
		if r.EndedAt != nil && r.EndedAt.After(t) {
			t = *r.EndedAt
		}
	}
	return t
}
func closeRest(w *Workout, t time.Time, reason string) error {
	for i := range w.CurrentRevision.RestIntervals {
		rest := &w.CurrentRevision.RestIntervals[i]
		if rest.EndedAt == nil {
			if t.Before(rest.StartedAt) {
				return httpx.Fail(422, "invalid_rest_time")
			}
			rest.EndedAt = &t
			rest.EndReason = &reason
		}
	}
	return nil
}
func eventTime(w *Workout, cmd Command, t time.Time) error {
	if !timestamp(t) || t.Before(latest(w)) || t.After(cmd.OccurredAt.Add(5*time.Minute)) {
		return httpx.Fail(422, "invalid_timestamp")
	}
	return nil
}
func apply(w *Workout, cmd Command) error {
	switch cmd.Type {
	case "begin_set":
		var p struct {
			SetID     string    `json:"setId"`
			StartedAt time.Time `json:"startedAt"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		s, err := find(w, p.SetID)
		if err != nil {
			return err
		}
		if s.Status != "pending" || s.StartedAt != nil {
			return httpx.Fail(409, "set_already_started")
		}
		for _, e := range w.CurrentRevision.Exercises {
			for _, other := range e.Sets {
				if other.Status == "pending" && other.StartedAt != nil {
					return httpx.Fail(409, "another_set_started")
				}
			}
		}
		if err = eventTime(w, cmd, p.StartedAt); err != nil {
			return err
		}
		if err = closeRest(w, p.StartedAt, "next_set"); err != nil {
			return err
		}
		s.StartedAt = &p.StartedAt
	case "complete_set":
		var p struct {
			SetID          string    `json:"setId"`
			ActualWeightKg string    `json:"actualWeightKg"`
			ActualReps     int       `json:"actualReps"`
			CompletedAt    time.Time `json:"completedAt"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		if !programs.Weight(p.ActualWeightKg) || p.ActualReps < 1 || p.ActualReps > 1000 {
			return httpx.Fail(422, "invalid_fact")
		}
		s, err := find(w, p.SetID)
		if err != nil {
			return err
		}
		if s.Status != "pending" {
			return httpx.Fail(409, "set_not_pending")
		}
		for _, rest := range w.CurrentRevision.RestIntervals {
			if rest.EndedAt == nil {
				return httpx.Fail(409, "begin_next_set_first")
			}
		}
		for _, e := range w.CurrentRevision.Exercises {
			for _, other := range e.Sets {
				if other.ID != s.ID && other.Status == "pending" && other.StartedAt != nil {
					return httpx.Fail(409, "another_set_started")
				}
			}
		}
		if err = eventTime(w, cmd, p.CompletedAt); err != nil {
			return err
		}
		s.Status = "completed"
		s.ActualWeightKg = &p.ActualWeightKg
		s.ActualReps = &p.ActualReps
		s.CompletedAt = &p.CompletedAt
		w.CurrentRevision.RestIntervals = append(w.CurrentRevision.RestIntervals, Rest{ID: id.New(), AfterSetID: s.ID, StartedAt: p.CompletedAt})
	case "undo_last_set":
		var p struct {
			SetID string `json:"setId"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		s, err := find(w, p.SetID)
		if err != nil {
			return err
		}
		rs := w.CurrentRevision.RestIntervals
		if s.Status != "completed" || len(rs) == 0 || rs[len(rs)-1].AfterSetID != s.ID || rs[len(rs)-1].EndedAt != nil {
			return httpx.Fail(409, "cannot_undo_after_next_set")
		}
		s.Status = "pending"
		s.ActualReps = nil
		s.ActualWeightKg = nil
		s.CompletedAt = nil
		w.CurrentRevision.RestIntervals = rs[:len(rs)-1]
	case "correct_set":
		var p struct {
			SetID          string `json:"setId"`
			ActualWeightKg string `json:"actualWeightKg"`
			ActualReps     int    `json:"actualReps"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		s, err := find(w, p.SetID)
		if err != nil {
			return err
		}
		if s.Status != "completed" {
			return httpx.Fail(409, "set_not_completed")
		}
		if !programs.Weight(p.ActualWeightKg) || p.ActualReps < 1 || p.ActualReps > 1000 {
			return httpx.Fail(422, "invalid_fact")
		}
		s.ActualWeightKg = &p.ActualWeightKg
		s.ActualReps = &p.ActualReps
	case "finish_workout":
		var p struct {
			FinishedAt    time.Time `json:"finishedAt"`
			SkipRemaining *bool     `json:"skipRemaining"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		if p.SkipRemaining == nil {
			return httpx.Fail(422, "skip_confirmation_required")
		}
		if err := eventTime(w, cmd, p.FinishedAt); err != nil {
			return err
		}
		for i := range w.CurrentRevision.Exercises {
			for j := range w.CurrentRevision.Exercises[i].Sets {
				s := &w.CurrentRevision.Exercises[i].Sets[j]
				if s.Status == "pending" {
					if !*p.SkipRemaining {
						return httpx.Fail(409, "unfinished_sets")
					}
					s.Status = "skipped"
				}
			}
		}
		if err := closeRest(w, p.FinishedAt, "finish"); err != nil {
			return err
		}
		w.Status = "completed"
		w.FinishedAt = &p.FinishedAt
	case "discard_workout":
		var empty struct{}
		if err := httpx.Strict(cmd.Payload, &empty); err != nil {
			return err
		}
		if err := eventTime(w, cmd, cmd.OccurredAt); err != nil {
			return err
		}
		if err := closeRest(w, cmd.OccurredAt, "finish"); err != nil {
			return err
		}
		w.Status = "discarded"
		w.FinishedAt = &cmd.OccurredAt
	case "replace_active_exercises":
		var p struct {
			Exercises []Exercise `json:"exercises"`
		}
		if err := httpx.Strict(cmd.Payload, &p); err != nil {
			return err
		}
		if err := validateResult(p.Exercises, w.CurrentRevision.RestIntervals, w.StartedAt, nil); err != nil {
			return err
		}
		replacement := Workout{CurrentRevision: Revision{Exercises: p.Exercises}}
		for _, e := range w.CurrentRevision.Exercises {
			for _, s := range e.Sets {
				if s.Status == "completed" || s.StartedAt != nil {
					next, err := find(&replacement, s.ID)
					if err != nil || !reflect.DeepEqual(s, *next) {
						return httpx.Fail(409, "completed_set_would_change")
					}
				}
			}
			for i := range replacement.CurrentRevision.Exercises {
				x := &replacement.CurrentRevision.Exercises[i]
				if x.ID == e.ID {
					if x.ExerciseID != e.ExerciseID {
						return httpx.Fail(409, "exercise_identity_changed")
					}
					x.NameSnapshot = e.NameSnapshot
					x.TechniqueSnapshot = e.TechniqueSnapshot
				}
			}
		}
		w.CurrentRevision.Exercises = replacement.CurrentRevision.Exercises
	default:
		return httpx.Fail(422, "unsupported_command")
	}
	return nil
}

// validateResult checks cross-row timeline constraints before any SQL writes.
func validateResult(xs []Exercise, rests []Rest, start time.Time, finish *time.Time) error {
	if len(xs) < 1 || len(xs) > 100 || len(rests) > 10000 {
		return httpx.Fail(422, "invalid_result")
	}
	ids := map[string]bool{}
	positions := map[int]bool{}
	sets := map[string]Set{}
	for _, e := range xs {
		if !httpx.UUID(e.ID) || !httpx.UUID(e.ExerciseID) || ids[e.ID] || positions[e.Position] || e.Position < 1 || e.Position > 100 || !httpx.Text(e.NameSnapshot, 1, 120) || !httpx.Text(e.Note, 0, 10000) || len(e.Sets) < 1 || len(e.Sets) > 100 {
			return httpx.Fail(422, "invalid_exercise")
		}
		ids[e.ID] = true
		positions[e.Position] = true
		sp := map[int]bool{}
		for _, s := range e.Sets {
			if !httpx.UUID(s.ID) || ids[s.ID] || sp[s.Position] || s.Position < 1 || s.Position > 100 || s.PlannedWeightKg != nil && !programs.Weight(*s.PlannedWeightKg) || (s.PlannedRepsMin == nil) != (s.PlannedRepsMax == nil) || s.PlannedRepsMin != nil && (*s.PlannedRepsMin < 1 || *s.PlannedRepsMax < *s.PlannedRepsMin || *s.PlannedRepsMax > 1000) {
				return httpx.Fail(422, "invalid_set")
			}
			ids[s.ID] = true
			sp[s.Position] = true
			sets[s.ID] = s
			switch s.Status {
			case "completed":
				if s.ActualWeightKg == nil || !programs.Weight(*s.ActualWeightKg) || s.ActualReps == nil || *s.ActualReps < 1 || *s.ActualReps > 1000 || s.CompletedAt == nil {
					return httpx.Fail(422, "invalid_fact")
				}
			case "pending", "skipped":
				if s.ActualWeightKg != nil || s.ActualReps != nil || s.CompletedAt != nil {
					return httpx.Fail(422, "unexpected_fact")
				}
			default:
				return httpx.Fail(422, "invalid_set_status")
			}
			if finish != nil && s.Status == "pending" {
				return httpx.Fail(422, "unfinished_result")
			}
			for _, t := range []*time.Time{s.StartedAt, s.CompletedAt} {
				if t != nil && (t.Before(start) || t.After(time.Now().Add(5*time.Minute)) || finish != nil && t.After(*finish)) {
					return httpx.Fail(422, "invalid_timestamp")
				}
			}
			if s.StartedAt != nil && s.CompletedAt != nil && s.CompletedAt.Before(*s.StartedAt) {
				return httpx.Fail(422, "invalid_timestamp")
			}
		}
	}
	seen := map[string]bool{}
	var priorEnd *time.Time
	for index, r := range rests {
		s, ok := sets[r.AfterSetID]
		if !httpx.UUID(r.ID) || ids[r.ID] || seen[r.AfterSetID] || !ok || s.Status != "completed" || s.CompletedAt == nil || !r.StartedAt.Equal(*s.CompletedAt) || r.StartedAt.Before(start) || priorEnd != nil && r.StartedAt.Before(*priorEnd) {
			return httpx.Fail(422, "invalid_rest")
		}
		ids[r.ID] = true
		seen[r.AfterSetID] = true
		if r.EndedAt == nil {
			if finish != nil || r.EndReason != nil || index != len(rests)-1 {
				return httpx.Fail(422, "open_rest_in_result")
			}
		} else {
			if r.EndedAt.Before(r.StartedAt) || r.EndReason == nil || (*r.EndReason != "next_set" && *r.EndReason != "finish" && *r.EndReason != "correction") || finish != nil && r.EndedAt.After(*finish) {
				return httpx.Fail(422, "invalid_rest")
			}
			nextStarted := false
			for _, other := range sets {
				if other.ID != r.AfterSetID && other.StartedAt != nil {
					if other.StartedAt.After(r.StartedAt) && other.StartedAt.Before(*r.EndedAt) {
						return httpx.Fail(422, "rest_overlaps_set")
					}
					if other.StartedAt.Equal(*r.EndedAt) {
						nextStarted = true
					}
				}
			}
			if *r.EndReason == "next_set" && !nextStarted {
				return httpx.Fail(422, "rest_missing_next_set")
			}
		}
		priorEnd = r.EndedAt
	}
	for _, s := range sets {
		if s.Status == "completed" && !seen[s.ID] {
			return httpx.Fail(422, "completed_set_missing_rest")
		}
	}
	return nil
}
