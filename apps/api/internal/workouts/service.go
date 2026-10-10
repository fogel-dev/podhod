package workouts

import (
	"context"
	"errors"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/jackc/pgx/v5"
	"net/http"
	"reflect"
	"time"
)

type Service struct {
	Core *httpx.Core
	Auth *auth.Service
}

func (s *Service) RegisterRoutes(m *http.ServeMux) {
	s.registerHistory(m)
	for pattern, fn := range map[string]func(http.ResponseWriter, *http.Request, auth.Actor){"POST /api/v1/workouts": s.start, "GET /api/v1/workouts": s.list, "GET /api/v1/workouts/active": s.active, "GET /api/v1/workouts/{id}": s.get, "POST /api/v1/workouts/{id}/commands": s.command} {
		m.HandleFunc(pattern, s.Auth.Require(fn))
	}
}
func (s *Service) get(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	value, err := Load(r.Context(), tx, a.User.ID, r.PathValue("id"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	w.Header().Set("ETag", httpx.ETag(value.Version))
	httpx.JSON(w, 200, value)
}
func (s *Service) active(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	var wid string
	err = tx.QueryRow(r.Context(), `SELECT id::text FROM workouts WHERE user_id=$1 AND status='active'`, a.User.ID).Scan(&wid)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.JSON(w, 200, nil)
		return
	}
	if err != nil {
		httpx.Error(w, err)
		return
	}
	value, err := Load(r.Context(), tx, a.User.ID, wid)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	w.Header().Set("ETag", httpx.ETag(value.Version))
	httpx.JSON(w, 200, value)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	from, to := r.URL.Query().Get("from"), r.URL.Query().Get("to")
	if _, err := httpx.Date(from); err != nil {
		httpx.Error(w, err)
		return
	}
	if _, err := httpx.Date(to); err != nil || from > to {
		httpx.Error(w, httpx.Fail(422, "invalid_period"))
		return
	}
	status, exercise := r.URL.Query().Get("status"), r.URL.Query().Get("exerciseId")
	if status != "" && status != "active" && status != "completed" && status != "discarded" || exercise != "" && !httpx.UUID(exercise) {
		httpx.Error(w, httpx.Fail(422, "invalid_filter"))
		return
	}
	filter := from + "|" + to + "|" + status + "|" + exercise
	limit, after, err := s.Core.Page(r, a.User.ID, "workouts", filter)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	rows, err := tx.Query(r.Context(), `SELECT w.id::text FROM workouts w WHERE user_id=$1 AND id>$2 AND local_date BETWEEN $3::date AND $4::date AND ($5='' OR status=$5) AND ($6='' OR EXISTS(SELECT 1 FROM workout_exercises e WHERE e.user_id=w.user_id AND e.revision_id=w.current_revision_id AND e.exercise_id::text=$6)) ORDER BY id LIMIT $7`, a.User.ID, after, from, to, status, exercise, limit+1)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	ids := []string{}
	for rows.Next() {
		var wid string
		if err = rows.Scan(&wid); err != nil {
			break
		}
		ids = append(ids, wid)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var next *string
	if len(ids) > limit {
		ids = ids[:limit]
		v := s.Core.Cursor(a.User.ID, "workouts", filter, ids[len(ids)-1])
		next = &v
	}
	items := []Workout{}
	for _, wid := range ids {
		value, err := Load(r.Context(), tx, a.User.ID, wid)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		items = append(items, value)
	}
	httpx.JSON(w, 200, map[string]any{"items": items, "nextCursor": next})
}
func (s *Service) start(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in Start
	if !httpx.Decode(w, r, &in) {
		return
	}
	loc, err := time.LoadLocation(in.Timezone)
	if err != nil || in.Timezone == "Local" || !httpx.Text(in.Timezone, 1, 100) || !httpx.UUID(in.ID) || !timestamp(in.StartedAt) || in.LocalDate != in.StartedAt.In(loc).Format("2006-01-02") || (in.ProgramRevisionID == nil) != (in.ScheduledDate == nil) {
		httpx.Error(w, httpx.Fail(422, "invalid_start"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		var pid *string
		var planned []programs.Exercise
		if in.ProgramRevisionID != nil {
			if !httpx.UUID(*in.ProgramRevisionID) {
				return httpx.Result{}, httpx.Fail(422, "invalid_revision")
			}
			if _, err := httpx.Date(*in.ScheduledDate); err != nil {
				return httpx.Result{}, err
			}
			var program string
			if err := tx.QueryRow(r.Context(), `SELECT program_id::text FROM program_revisions WHERE user_id=$1 AND id=$2`, a.User.ID, *in.ProgramRevisionID).Scan(&program); err != nil {
				return httpx.Result{}, err
			}
			rev, err := programs.LoadRevision(r.Context(), tx, a.User.ID, program, *in.ProgramRevisionID)
			if err != nil {
				return httpx.Result{}, err
			}
			if *in.ScheduledDate < rev.EffectiveFrom || *in.ScheduledDate < rev.StartDate || *in.ScheduledDate > rev.EndDate || rev.Timezone != in.Timezone || rev.CreatedAt.After(in.StartedAt.Add(5*time.Minute)) {
				return httpx.Result{}, httpx.Fail(409, "plan_not_available")
			}
			source, _ := httpx.Date(*in.ScheduledDate)
			weekday := int(source.Weekday())
			if weekday == 0 {
				weekday = 7
			}
			var day *programs.Day
			for i := range rev.Days {
				if rev.Days[i].Weekday == weekday {
					day = &rev.Days[i]
				}
			}
			if day == nil || len(day.Exercises) != len(in.Exercises) {
				return httpx.Result{}, httpx.Fail(409, "snapshot_mismatch")
			}
			for i, x := range day.Exercises {
				actual := in.Exercises[i]
				if x.ExerciseID != actual.ExerciseID || x.Position != actual.Position || x.Note != actual.Note || len(x.Targets) != len(actual.Targets) {
					return httpx.Result{}, httpx.Fail(409, "snapshot_mismatch")
				}
				for j, t := range x.Targets {
					target := actual.Targets[j]
					t.ID = target.ID
					if !reflect.DeepEqual(t, target) {
						return httpx.Result{}, httpx.Fail(409, "snapshot_mismatch")
					}
				}
			}
			pid = &program
			planned = day.Exercises
		}
		xs, err := snapshots(r.Context(), tx, a.User.ID, in.Exercises)
		if err != nil {
			return httpx.Result{}, err
		}
		for i := range planned {
			xs[i].NameSnapshot = planned[i].NameSnapshot
		}
		rid := id.New()
		_, err = tx.Exec(r.Context(), `INSERT INTO workouts(id,user_id,program_id,program_revision_id,scheduled_date,local_date,timezone,status,started_at,current_revision_id) VALUES($1,$2,$3,$4,$5,$6,$7,'active',$8,$9)`, in.ID, a.User.ID, pid, in.ProgramRevisionID, in.ScheduledDate, in.LocalDate, in.Timezone, in.StartedAt, rid)
		if err != nil {
			return httpx.Result{}, err
		}
		_, err = tx.Exec(r.Context(), `INSERT INTO workout_revisions(id,user_id,workout_id,revision_no,started_at) VALUES($1,$2,$3,1,$4)`, rid, a.User.ID, in.ID, in.StartedAt)
		if err != nil {
			return httpx.Result{}, err
		}
		rev := Revision{ID: rid, WorkoutID: in.ID, RevisionNo: 1, Exercises: xs, RestIntervals: []Rest{}}
		if err = store(r.Context(), tx, a.User.ID, rev, false); err != nil {
			return httpx.Result{}, err
		}
		_, err = tx.Exec(r.Context(), `INSERT INTO workout_events(user_id,workout_id,command_id,type,occurred_at,payload) VALUES($1,$2,$3,'start_workout',$4,jsonb_build_object('revisionId',$5::text))`, a.User.ID, in.ID, r.Header.Get("Idempotency-Key"), in.StartedAt, rid)
		if err == nil {
			err = httpx.Change(r.Context(), tx, a.User.ID, "workout", in.ID, "upsert", 1)
		}
		if err != nil {
			return httpx.Result{}, err
		}
		value, err := Load(r.Context(), tx, a.User.ID, in.ID)
		return httpx.Reply(201, value, 1), err
	})
}
func (s *Service) command(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var cmd Command
	if !httpx.Decode(w, r, &cmd) {
		return
	}
	if !httpx.UUID(cmd.AggregateID) || cmd.AggregateID != r.PathValue("id") || cmd.ExpectedVersion < 1 || cmd.ExpectedVersion > 9007199254740991 || !timestamp(cmd.OccurredAt) {
		httpx.Error(w, httpx.Fail(422, "invalid_command"))
		return
	}
	s.Core.Command(w, r, a, cmd.CommandID, cmd.DeviceID, cmd, func(tx pgx.Tx) (httpx.Result, error) {
		value, err := Load(r.Context(), tx, a.User.ID, cmd.AggregateID)
		if err != nil {
			return httpx.Result{}, err
		}
		if value.Version != cmd.ExpectedVersion {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		if cmd.Type == "correct_result" {
			return correct(r.Context(), tx, a.User.ID, value, cmd)
		}
		if value.Status != "active" {
			return httpx.Result{}, httpx.Fail(409, "workout_not_active")
		}
		if cmd.OccurredAt.Before(value.StartedAt) {
			return httpx.Result{}, httpx.Fail(422, "invalid_timestamp")
		}
		if err = apply(&value, cmd); err != nil {
			return httpx.Result{}, err
		}
		if cmd.Type == "replace_active_exercises" {
			if err = normalizeReplacement(r.Context(), tx, a.User.ID, &value); err != nil {
				return httpx.Result{}, err
			}
		}
		if err = store(r.Context(), tx, a.User.ID, value.CurrentRevision, true); err != nil {
			return httpx.Result{}, err
		}
		if value.Status != "active" {
			_, err = tx.Exec(r.Context(), `UPDATE workout_revisions SET sealed=true,finished_at=$3 WHERE user_id=$1 AND id=$2`, a.User.ID, value.CurrentRevision.ID, value.FinishedAt)
			if err != nil {
				return httpx.Result{}, err
			}
		}
		if err = bump(r.Context(), tx, a.User.ID, value, cmd.CommandID, cmd.Type, cmd.OccurredAt, cmd.Payload); err != nil {
			return httpx.Result{}, err
		}
		value, err = Load(r.Context(), tx, a.User.ID, value.ID)
		return httpx.Reply(200, map[string]any{"commandId": cmd.CommandID, "status": "applied", "version": value.Version, "aggregate": value}, value.Version), err
	})
}
