package workouts

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"strconv"
	"strings"
	"time"
)

type Set struct {
	ID              string     `json:"id"`
	Position        int        `json:"position"`
	PlannedWeightKg *string    `json:"plannedWeightKg"`
	PlannedRepsMin  *int       `json:"plannedRepsMin"`
	PlannedRepsMax  *int       `json:"plannedRepsMax"`
	Status          string     `json:"status"`
	ActualWeightKg  *string    `json:"actualWeightKg"`
	ActualReps      *int       `json:"actualReps"`
	StartedAt       *time.Time `json:"startedAt"`
	CompletedAt     *time.Time `json:"completedAt"`
}
type Exercise struct {
	ID                string           `json:"id"`
	ExerciseID        string           `json:"exerciseId"`
	Position          int              `json:"position"`
	NameSnapshot      string           `json:"nameSnapshot"`
	Note              string           `json:"note"`
	TechniqueSnapshot *exercises.Guide `json:"techniqueSnapshot"`
	Sets              []Set            `json:"sets"`
}
type Rest struct {
	ID         string     `json:"id"`
	AfterSetID string     `json:"afterSetId"`
	StartedAt  time.Time  `json:"startedAt"`
	EndedAt    *time.Time `json:"endedAt"`
	EndReason  *string    `json:"endReason"`
}
type Revision struct {
	ID            string     `json:"id"`
	WorkoutID     string     `json:"workoutId"`
	RevisionNo    int        `json:"revisionNo"`
	Reason        *string    `json:"reason"`
	CreatedAt     time.Time  `json:"createdAt"`
	Exercises     []Exercise `json:"exercises"`
	RestIntervals []Rest     `json:"restIntervals"`
}
type Summary struct {
	DurationSeconds           int64    `json:"durationSeconds"`
	CompletedSets             int      `json:"completedSets"`
	TotalReps                 int      `json:"totalReps"`
	Volume                    string   `json:"volume"`
	TotalRestSeconds          int64    `json:"totalRestSeconds"`
	MeanBetweenSetRestSeconds *float64 `json:"meanBetweenSetRestSeconds"`
}
type Workout struct {
	ID                string     `json:"id"`
	Version           int64      `json:"version"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
	ProgramID         *string    `json:"programId"`
	ProgramRevisionID *string    `json:"programRevisionId"`
	ScheduledDate     *string    `json:"scheduledDate"`
	LocalDate         string     `json:"localDate"`
	Timezone          string     `json:"timezone"`
	Status            string     `json:"status"`
	StartedAt         time.Time  `json:"startedAt"`
	FinishedAt        *time.Time `json:"finishedAt"`
	CurrentRevision   Revision   `json:"currentRevision"`
	Summary           Summary    `json:"summary"`
	Cardio            *Cardio    `json:"cardio"`
}
type Cardio struct {
	Activity        string `json:"activity"`
	DurationMinutes int    `json:"durationMinutes"`
}
type Start struct {
	ID                string                   `json:"id"`
	ProgramRevisionID *string                  `json:"programRevisionId"`
	ScheduledDate     *string                  `json:"scheduledDate"`
	LocalDate         string                   `json:"localDate"`
	Timezone          string                   `json:"timezone"`
	StartedAt         time.Time                `json:"startedAt"`
	Exercises         []programs.InputExercise `json:"exercises"`
}
type Command struct {
	CommandID       string          `json:"commandId"`
	DeviceID        string          `json:"deviceId"`
	AggregateID     string          `json:"aggregateId"`
	ExpectedVersion int64           `json:"expectedVersion"`
	OccurredAt      time.Time       `json:"occurredAt"`
	Type            string          `json:"type"`
	Payload         json.RawMessage `json:"payload"`
}

func MoneyCents(s string) int64 {
	n, _ := strconv.ParseInt(strings.ReplaceAll(s, ".", ""), 10, 64)
	return n
}
func Money(cents int64) string { return fmt.Sprintf("%d.%02d", cents/100, cents%100) }
func summarize(w Workout) Summary {
	s := Summary{Volume: "0.00"}
	end := time.Now().UTC()
	if w.FinishedAt != nil {
		end = *w.FinishedAt
	}
	s.DurationSeconds = int64(end.Sub(w.StartedAt).Seconds())
	if s.DurationSeconds < 0 {
		s.DurationSeconds = 0
	}
	var cents, between int64
	count := 0
	for _, e := range w.CurrentRevision.Exercises {
		for _, set := range e.Sets {
			if set.Status == "completed" && set.ActualWeightKg != nil && set.ActualReps != nil {
				s.CompletedSets++
				s.TotalReps += *set.ActualReps
				cents += MoneyCents(*set.ActualWeightKg) * int64(*set.ActualReps)
			}
		}
	}
	s.Volume = Money(cents)
	for _, r := range w.CurrentRevision.RestIntervals {
		stop := end
		if r.EndedAt != nil {
			stop = *r.EndedAt
		}
		duration := int64(stop.Sub(r.StartedAt).Seconds())
		if duration < 0 {
			duration = 0
		}
		s.TotalRestSeconds += duration
		if r.EndReason != nil && *r.EndReason == "next_set" {
			between += duration
			count++
		}
	}
	if count > 0 {
		mean := float64(between) / float64(count)
		s.MeanBetweenSetRestSeconds = &mean
	}
	return s
}
func LoadRevision(ctx context.Context, db programs.DB, user, wid, rid string) (Revision, error) {
	var r Revision
	err := db.QueryRow(ctx, `SELECT id::text,workout_id::text,revision_no,reason,created_at FROM workout_revisions WHERE user_id=$1 AND workout_id=$2 AND id=$3`, user, wid, rid).Scan(&r.ID, &r.WorkoutID, &r.RevisionNo, &r.Reason, &r.CreatedAt)
	if err != nil {
		return r, err
	}
	r.Exercises = []Exercise{}
	r.RestIntervals = []Rest{}
	rows, err := db.Query(ctx, `SELECT e.id::text,e.exercise_id::text,e.position,e.name_snapshot,e.note,e.technique_snapshot,s.id::text,s.position,s.planned_weight_kg::text,s.planned_reps_min,s.planned_reps_max,s.status,s.actual_weight_kg::text,s.actual_reps,s.started_at,s.completed_at FROM workout_exercises e JOIN workout_sets s ON s.workout_exercise_id=e.id AND s.revision_id=e.revision_id WHERE e.user_id=$1 AND e.revision_id=$2 ORDER BY e.position,s.position`, user, rid)
	if err != nil {
		return r, err
	}
	for rows.Next() {
		var e Exercise
		var s Set
		var guide []byte
		err = rows.Scan(&e.ID, &e.ExerciseID, &e.Position, &e.NameSnapshot, &e.Note, &guide, &s.ID, &s.Position, &s.PlannedWeightKg, &s.PlannedRepsMin, &s.PlannedRepsMax, &s.Status, &s.ActualWeightKg, &s.ActualReps, &s.StartedAt, &s.CompletedAt)
		if err != nil {
			break
		}
		if len(guide) > 0 {
			if err = json.Unmarshal(guide, &e.TechniqueSnapshot); err != nil {
				break
			}
		}
		if len(r.Exercises) == 0 || r.Exercises[len(r.Exercises)-1].ID != e.ID {
			e.Sets = []Set{}
			r.Exercises = append(r.Exercises, e)
		}
		x := &r.Exercises[len(r.Exercises)-1]
		x.Sets = append(x.Sets, s)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return r, err
	}
	rows, err = db.Query(ctx, `SELECT id::text,after_set_id::text,started_at,ended_at,end_reason FROM rest_intervals WHERE user_id=$1 AND revision_id=$2 ORDER BY started_at,(ended_at IS NULL),id`, user, rid)
	if err != nil {
		return r, err
	}
	defer rows.Close()
	for rows.Next() {
		var rest Rest
		if err = rows.Scan(&rest.ID, &rest.AfterSetID, &rest.StartedAt, &rest.EndedAt, &rest.EndReason); err != nil {
			return r, err
		}
		r.RestIntervals = append(r.RestIntervals, rest)
	}
	return r, rows.Err()
}
func Load(ctx context.Context, db programs.DB, user, wid string) (Workout, error) {
	var w Workout
	var rid string
	var activity *string
	var minutes *int
	err := db.QueryRow(ctx, `SELECT id::text,version,created_at,updated_at,program_id::text,program_revision_id::text,scheduled_date::text,local_date::text,timezone,status,started_at,finished_at,current_revision_id::text,cardio_activity,cardio_minutes FROM workouts WHERE user_id=$1 AND id=$2`, user, wid).Scan(&w.ID, &w.Version, &w.CreatedAt, &w.UpdatedAt, &w.ProgramID, &w.ProgramRevisionID, &w.ScheduledDate, &w.LocalDate, &w.Timezone, &w.Status, &w.StartedAt, &w.FinishedAt, &rid, &activity, &minutes)
	if err != nil {
		return w, err
	}
	if activity != nil && minutes != nil {
		w.Cardio = &Cardio{Activity: *activity, DurationMinutes: *minutes}
	}
	w.CurrentRevision, err = LoadRevision(ctx, db, user, wid, rid)
	w.Summary = summarize(w)
	return w, err
}
func timestamp(t time.Time) bool {
	return !t.IsZero() && !t.After(time.Now().Add(5*time.Minute)) && !t.Before(time.Now().Add(-90*24*time.Hour))
}
func find(w *Workout, setID string) (*Set, error) {
	for i := range w.CurrentRevision.Exercises {
		for j := range w.CurrentRevision.Exercises[i].Sets {
			if w.CurrentRevision.Exercises[i].Sets[j].ID == setID {
				return &w.CurrentRevision.Exercises[i].Sets[j], nil
			}
		}
	}
	return nil, httpx.Fail(404, "set_not_found")
}
