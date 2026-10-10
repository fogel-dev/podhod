package programs

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strings"
)

type Service struct {
	Core *httpx.Core
	Auth *auth.Service
}

func (s *Service) RegisterRoutes(m *http.ServeMux) {
	for pattern, fn := range map[string]func(http.ResponseWriter, *http.Request, auth.Actor){"GET /api/v1/programs": s.list, "GET /api/v1/programs/{id}": s.get, "POST /api/v1/programs": s.create, "GET /api/v1/programs/{id}/revisions/{revisionId}": s.revision, "POST /api/v1/programs/{id}/revisions": s.publish, "POST /api/v1/programs/{id}/copy-day": s.copyDay, "POST /api/v1/programs/{id}/archive": s.archive, "PUT /api/v1/programs/{id}/exceptions/{sourceDate}": s.exception, "DELETE /api/v1/programs/{id}/exceptions/{sourceDate}": s.deleteException} {
		m.HandleFunc(pattern, s.Auth.Require(fn))
	}
}
func (s *Service) get(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	p, e := Load(r.Context(), tx, a.User.ID, r.PathValue("id"))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	w.Header().Set("ETag", httpx.ETag(p.Version))
	httpx.JSON(w, 200, p)
}
func (s *Service) revision(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) || !httpx.UUID(r.PathValue("revisionId")) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	rev, e := LoadRevision(r.Context(), tx, a.User.ID, r.PathValue("id"), r.PathValue("revisionId"))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	httpx.JSON(w, 200, rev)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	arch := r.URL.Query().Get("includeArchived")
	if arch != "" && arch != "true" && arch != "false" {
		httpx.Error(w, httpx.Fail(422, "invalid_filter"))
		return
	}
	limit, after, e := s.Core.Page(r, a.User.ID, "programs", arch)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	rows, e := tx.Query(r.Context(), `SELECT id::text FROM programs WHERE user_id=$1 AND id>$2 AND ($3 OR archived_at IS NULL) ORDER BY id LIMIT $4`, a.User.ID, after, arch == "true", limit+1)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	ids := []string{}
	for rows.Next() {
		var id string
		e = rows.Scan(&id)
		if e != nil {
			break
		}
		ids = append(ids, id)
	}
	if e == nil {
		e = rows.Err()
	}
	rows.Close()
	if e != nil {
		httpx.Error(w, e)
		return
	}
	var next *string
	if len(ids) > limit {
		ids = ids[:limit]
		v := s.Core.Cursor(a.User.ID, "programs", arch, ids[len(ids)-1])
		next = &v
	}
	items := []Program{}
	for _, pid := range ids {
		p, err := Load(r.Context(), tx, a.User.ID, pid)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		items = append(items, p)
	}
	httpx.JSON(w, 200, map[string]any{"items": items, "nextCursor": next})
}
func insertRevision(ctx context.Context, tx pgx.Tx, user, pid, rid string, no int, in Input) error {
	_, err := tx.Exec(ctx, `INSERT INTO program_revisions(id,user_id,program_id,revision_no,start_date,end_date,effective_from,timezone) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, rid, user, pid, no, in.StartDate, in.EndDate, in.EffectiveFrom, in.Timezone)
	if err != nil {
		return err
	}
	for _, d := range in.Days {
		dayID := id.New()
		if _, err = tx.Exec(ctx, `INSERT INTO program_days(id,user_id,revision_id,weekday) VALUES($1,$2,$3,$4)`, dayID, user, rid, d.Weekday); err != nil {
			return err
		}
		for _, x := range d.Exercises {
			var name string
			if err = tx.QueryRow(ctx, `SELECT name FROM exercises WHERE user_id=$1 AND id=$2 AND archived_at IS NULL`, user, x.ExerciseID).Scan(&name); err != nil {
				return err
			}
			if _, err = tx.Exec(ctx, `INSERT INTO program_day_exercises(id,user_id,revision_id,day_id,exercise_id,position,name_snapshot,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, x.ID, user, rid, dayID, x.ExerciseID, x.Position, name, x.Note); err != nil {
				return err
			}
			for _, t := range x.Targets {
				if _, err = tx.Exec(ctx, `INSERT INTO program_set_targets(id,user_id,revision_id,day_exercise_id,position,weight_kg,reps_min,reps_max) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, t.ID, user, rid, x.ID, t.Position, t.WeightKg, t.RepsMin, t.RepsMax); err != nil {
					return err
				}
			}
		}
	}
	_, err = tx.Exec(ctx, `UPDATE program_revisions SET sealed=true WHERE id=$1`, rid)
	return err
}
func overlap(ctx context.Context, tx pgx.Tx, user, pid string, in Input) error {
	var exists bool
	err := tx.QueryRow(ctx, `WITH ranges AS (SELECT r.program_id,r.effective_from AS first_day,LEAST(r.end_date,COALESCE(p.archived_from-1,r.end_date),COALESCE(lead(r.effective_from) OVER(PARTITION BY r.program_id ORDER BY r.effective_from,r.revision_no)-1,r.end_date)) AS last_day FROM program_revisions r JOIN programs p ON p.id=r.program_id AND p.user_id=r.user_id WHERE r.user_id=$1 AND r.program_id<>$2) SELECT EXISTS(SELECT 1 FROM ranges WHERE first_day<=last_day AND first_day<=$4::date AND last_day>=$3::date)`, user, pid, in.EffectiveFrom, in.EndDate).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return httpx.Fail(409, "overlapping_program")
	}
	return nil
}
func (s *Service) create(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Revision Input  `json:"revision"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !httpx.UUID(in.ID) || !httpx.Text(strings.TrimSpace(in.Name), 1, 120) {
		httpx.Error(w, httpx.Fail(422, "invalid_program"))
		return
	}
	if e := validate(in.Revision); e != nil {
		httpx.Error(w, e)
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		if e := overlap(r.Context(), tx, a.User.ID, in.ID, in.Revision); e != nil {
			return httpx.Result{}, e
		}
		rid := id.New()
		_, e := tx.Exec(r.Context(), `INSERT INTO programs(id,user_id,name,current_revision_id) VALUES($1,$2,$3,$4)`, in.ID, a.User.ID, strings.TrimSpace(in.Name), rid)
		if e == nil {
			e = insertRevision(r.Context(), tx, a.User.ID, in.ID, rid, 1, in.Revision)
		}
		if e != nil {
			return httpx.Result{}, e
		}
		return finish(r.Context(), tx, a.User.ID, in.ID, 201)
	})
}
func finish(ctx context.Context, tx pgx.Tx, user, pid string, status int) (httpx.Result, error) {
	p, e := Load(ctx, tx, user, pid)
	if e == nil {
		e = httpx.Change(ctx, tx, user, "program", pid, "upsert", p.Version)
	}
	return httpx.Reply(status, p, p.Version), e
}
func current(ctx context.Context, tx pgx.Tx, user, pid string, version int64) (Program, error) {
	if !httpx.UUID(pid) {
		return Program{}, httpx.Fail(404, "not_found")
	}
	p, e := Load(ctx, tx, user, pid)
	if e != nil {
		return p, e
	}
	if p.Version != version {
		return p, httpx.Fail(409, "version_conflict")
	}
	return p, nil
}
func publishRevision(ctx context.Context, tx pgx.Tx, user string, p Program, in Input) (httpx.Result, error) {
	if e := validate(in); e != nil {
		return httpx.Result{}, e
	}
	if p.ArchivedAt != nil || in.Timezone != p.CurrentRevision.Timezone || in.EffectiveFrom < p.CurrentRevision.EffectiveFrom {
		return httpx.Result{}, httpx.Fail(409, "invalid_revision_transition")
	}
	if e := overlap(ctx, tx, user, p.ID, in); e != nil {
		return httpx.Result{}, e
	}
	rid := id.New()
	e := insertRevision(ctx, tx, user, p.ID, rid, p.CurrentRevision.RevisionNo+1, in)
	if e != nil {
		return httpx.Result{}, e
	}
	_, e = tx.Exec(ctx, `UPDATE programs SET current_revision_id=$3,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, user, p.ID, rid)
	if e != nil {
		return httpx.Result{}, e
	}
	if e = validateExceptions(ctx, tx, user, p.ID); e != nil {
		return httpx.Result{}, e
	}
	return finish(ctx, tx, user, p.ID, 200)
}
func (s *Service) publish(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ExpectedVersion int64 `json:"expectedVersion"`
		Revision        Input `json:"revision"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		p, e := current(r.Context(), tx, a.User.ID, r.PathValue("id"), in.ExpectedVersion)
		if e != nil {
			return httpx.Result{}, e
		}
		return publishRevision(r.Context(), tx, a.User.ID, p, in.Revision)
	})
}
func toInput(rev Revision) Input {
	in := Input{rev.StartDate, rev.EndDate, rev.EffectiveFrom, rev.Timezone, []InputDay{}}
	for _, d := range rev.Days {
		day := InputDay{d.Weekday, []InputExercise{}}
		for _, x := range d.Exercises {
			day.Exercises = append(day.Exercises, InputExercise{x.ID, x.ExerciseID, x.Position, x.Note, x.Targets})
		}
		in.Days = append(in.Days, day)
	}
	return in
}
func (s *Service) copyDay(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ExpectedVersion int64  `json:"expectedVersion"`
		EffectiveFrom   string `json:"effectiveFrom"`
		SourceWeekday   int    `json:"sourceWeekday"`
		TargetWeekdays  []int  `json:"targetWeekdays"`
		ReplaceExisting bool   `json:"replaceExisting"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		p, e := current(r.Context(), tx, a.User.ID, r.PathValue("id"), in.ExpectedVersion)
		if e != nil {
			return httpx.Result{}, e
		}
		rev := toInput(p.CurrentRevision)
		rev.EffectiveFrom = in.EffectiveFrom
		var source *InputDay
		for i := range rev.Days {
			if rev.Days[i].Weekday == in.SourceWeekday {
				v := rev.Days[i]
				source = &v
			}
		}
		if source == nil || len(in.TargetWeekdays) < 1 || len(in.TargetWeekdays) > 6 {
			return httpx.Result{}, httpx.Fail(422, "invalid_copy_days")
		}
		seen := map[int]bool{}
		for _, weekday := range in.TargetWeekdays {
			if weekday < 1 || weekday > 7 || weekday == in.SourceWeekday || seen[weekday] {
				return httpx.Result{}, httpx.Fail(422, "invalid_copy_days")
			}
			seen[weekday] = true
			index := -1
			for i, d := range rev.Days {
				if d.Weekday == weekday {
					index = i
				}
			}
			if index >= 0 && !in.ReplaceExisting {
				return httpx.Result{}, httpx.Fail(409, "copy_would_replace")
			}
			copy := InputDay{weekday, []InputExercise{}}
			for _, x := range source.Exercises {
				x.ID = id.New()
				targets := []Target{}
				for _, t := range x.Targets {
					t.ID = id.New()
					targets = append(targets, t)
				}
				x.Targets = targets
				copy.Exercises = append(copy.Exercises, x)
			}
			if index >= 0 {
				rev.Days[index] = copy
			} else {
				rev.Days = append(rev.Days, copy)
			}
		}
		return publishRevision(r.Context(), tx, a.User.ID, p, rev)
	})
}
func (s *Service) archive(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ExpectedVersion int64  `json:"expectedVersion"`
		EffectiveFrom   string `json:"effectiveFrom"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		p, e := current(r.Context(), tx, a.User.ID, r.PathValue("id"), in.ExpectedVersion)
		if e != nil {
			return httpx.Result{}, e
		}
		if _, e = httpx.Date(in.EffectiveFrom); e != nil {
			return httpx.Result{}, e
		}
		if p.ArchivedAt != nil || in.EffectiveFrom < Today(p.CurrentRevision.Timezone) {
			return httpx.Result{}, httpx.Fail(409, "invalid_archive")
		}
		_, e = tx.Exec(r.Context(), `UPDATE programs SET archived_at=now(),archived_from=$3,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, a.User.ID, p.ID, in.EffectiveFrom)
		if e == nil {
			e = validateExceptions(r.Context(), tx, a.User.ID, p.ID)
		}
		if e != nil {
			return httpx.Result{}, e
		}
		return finish(r.Context(), tx, a.User.ID, p.ID, 200)
	})
}
