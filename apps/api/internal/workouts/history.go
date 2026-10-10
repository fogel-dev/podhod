package workouts

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"net/http"
	"sort"
	"time"
)

func (s *Service) registerHistory(m *http.ServeMux) {
	m.HandleFunc("GET /api/v1/workouts/{id}/revisions", s.Auth.Require(s.history))
	m.HandleFunc("GET /api/v1/workouts/{id}/revisions/{revisionId}", s.Auth.Require(s.historyRevision))
}
func (s *Service) historyRevision(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) || !httpx.UUID(r.PathValue("revisionId")) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	value, err := LoadRevision(r.Context(), tx, a.User.ID, r.PathValue("id"), r.PathValue("revisionId"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, 200, value)
}
func (s *Service) history(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	wid := r.PathValue("id")
	if !httpx.UUID(wid) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	limit, after, err := s.Core.Page(r, a.User.ID, "workout_revisions", wid)
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
	var own string
	if err = tx.QueryRow(r.Context(), `SELECT id::text FROM workouts WHERE user_id=$1 AND id=$2`, a.User.ID, wid).Scan(&own); err != nil {
		httpx.Error(w, err)
		return
	}
	rows, err := tx.Query(r.Context(), `SELECT id::text FROM workout_revisions WHERE user_id=$1 AND workout_id=$2 AND id>$3 ORDER BY id LIMIT $4`, a.User.ID, wid, after, limit+1)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	ids := []string{}
	for rows.Next() {
		var rid string
		if err = rows.Scan(&rid); err != nil {
			break
		}
		ids = append(ids, rid)
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
		v := s.Core.Cursor(a.User.ID, "workout_revisions", wid, ids[len(ids)-1])
		next = &v
	}
	items := []Revision{}
	for _, rid := range ids {
		rev, err := LoadRevision(r.Context(), tx, a.User.ID, wid, rid)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		items = append(items, rev)
	}
	httpx.JSON(w, 200, map[string]any{"items": items, "nextCursor": next})
}
func correct(ctx context.Context, tx pgx.Tx, user string, value Workout, cmd Command) (httpx.Result, error) {
	if value.Status != "completed" {
		return httpx.Result{}, httpx.Fail(409, "workout_not_completed")
	}
	var p struct {
		Reason        string     `json:"reason"`
		StartedAt     time.Time  `json:"startedAt"`
		FinishedAt    time.Time  `json:"finishedAt"`
		Exercises     []Exercise `json:"exercises"`
		RestIntervals []Rest     `json:"restIntervals"`
	}
	if err := httpx.Strict(cmd.Payload, &p); err != nil {
		return httpx.Result{}, err
	}
	loc, err := time.LoadLocation(value.Timezone)
	if err != nil {
		return httpx.Result{}, err
	}
	if !httpx.Text(p.Reason, 1, 10000) || p.StartedAt.IsZero() || p.FinishedAt.IsZero() || p.FinishedAt.Before(p.StartedAt) || p.FinishedAt.After(time.Now().Add(5*time.Minute)) || p.StartedAt.In(loc).Format("2006-01-02") != value.LocalDate {
		return httpx.Result{}, httpx.Fail(422, "invalid_correction")
	}
	sort.SliceStable(p.RestIntervals, func(i, j int) bool { return p.RestIntervals[i].StartedAt.Before(p.RestIntervals[j].StartedAt) })
	if err = validateResult(p.Exercises, p.RestIntervals, p.StartedAt, &p.FinishedAt); err != nil {
		return httpx.Result{}, err
	}
	previous := map[string]Exercise{}
	for _, e := range value.CurrentRevision.Exercises {
		previous[e.ID] = e
	}
	for i := range p.Exercises {
		e := &p.Exercises[i]
		if old, ok := previous[e.ID]; ok && old.ExerciseID == e.ExerciseID {
			e.NameSnapshot = old.NameSnapshot
			e.TechniqueSnapshot = old.TechniqueSnapshot
		} else {
			var guide []byte
			if err = tx.QueryRow(ctx, `SELECT name,(SELECT json_build_object('body',g.body,'sourceTitle',g.source_title,'sourceUrl',g.source_url,'reviewedAt',g.reviewed_at,'sourceAccessedAt',g.source_accessed_at) FROM technique_guides g WHERE g.exercise_id=x.id AND g.reviewed_at<=now()) FROM exercises x WHERE x.id=$1`, e.ExerciseID).Scan(&e.NameSnapshot, &guide); err != nil {
				return httpx.Result{}, err
			}
			e.TechniqueSnapshot = nil
			if len(guide) > 0 {
				if err = json.Unmarshal(guide, &e.TechniqueSnapshot); err != nil {
					return httpx.Result{}, err
				}
			}
		}
	}
	rid := id.New()
	_, err = tx.Exec(ctx, `INSERT INTO workout_revisions(id,user_id,workout_id,revision_no,reason,started_at,finished_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, rid, user, value.ID, value.CurrentRevision.RevisionNo+1, p.Reason, p.StartedAt, p.FinishedAt)
	if err != nil {
		return httpx.Result{}, err
	}
	value.StartedAt = p.StartedAt
	value.FinishedAt = &p.FinishedAt
	value.CurrentRevision = Revision{ID: rid, WorkoutID: value.ID, RevisionNo: value.CurrentRevision.RevisionNo + 1, Reason: &p.Reason, Exercises: p.Exercises, RestIntervals: p.RestIntervals}
	if err = store(ctx, tx, user, value.CurrentRevision, false); err != nil {
		return httpx.Result{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE workout_revisions SET sealed=true WHERE user_id=$1 AND id=$2`, user, rid)
	if err == nil {
		err = bump(ctx, tx, user, value, cmd.CommandID, cmd.Type, cmd.OccurredAt, cmd.Payload)
	}
	if err != nil {
		return httpx.Result{}, err
	}
	value, err = Load(ctx, tx, user, value.ID)
	return httpx.Reply(200, map[string]any{"commandId": cmd.CommandID, "status": "applied", "version": value.Version, "aggregate": value}, value.Version), err
}
