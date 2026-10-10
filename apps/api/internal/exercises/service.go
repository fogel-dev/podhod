package exercises

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"net/http"
	"strings"
	"time"
)

type Guide struct {
	Body             string    `json:"body"`
	SourceTitle      string    `json:"sourceTitle"`
	SourceURL        string    `json:"sourceUrl"`
	ReviewedAt       time.Time `json:"reviewedAt"`
	SourceAccessedAt time.Time `json:"sourceAccessedAt"`
}
type Exercise struct {
	ID             string     `json:"id"`
	Version        int64      `json:"version"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	Name           string     `json:"name"`
	Note           string     `json:"note"`
	ArchivedAt     *time.Time `json:"archivedAt"`
	TechniqueGuide *Guide     `json:"techniqueGuide"`
	CanEdit        bool       `json:"canEdit"`
}
type Service struct {
	Core *httpx.Core
	Auth *auth.Service
}

const columns = `e.id::text,e.version,e.created_at,e.updated_at,e.name,e.note,e.archived_at,(SELECT json_build_object('body',g.body,'sourceTitle',g.source_title,'sourceUrl',g.source_url,'reviewedAt',g.reviewed_at,'sourceAccessedAt',g.source_accessed_at) FROM technique_guides g WHERE g.exercise_id=e.id AND g.reviewed_at<=now()),e.user_id::text`

func scan(row pgx.Row, user string) (Exercise, error) {
	var e Exercise
	var owner string
	var guide []byte
	err := row.Scan(&e.ID, &e.Version, &e.CreatedAt, &e.UpdatedAt, &e.Name, &e.Note, &e.ArchivedAt, &guide, &owner)
	e.CanEdit = owner == user
	if !e.CanEdit {
		e.Note = ""
	}
	if err == nil && len(guide) > 0 {
		err = json.Unmarshal(guide, &e.TechniqueGuide)
	}
	return e, err
}

type Reader interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}

// Load returns a shared identity and technique, keeping the author's note private.
func Load(ctx context.Context, db Reader, user, id string) (Exercise, error) {
	return scan(db.QueryRow(ctx, `SELECT `+columns+` FROM exercises e WHERE e.id=$1`, id), user)
}
func (s *Service) RegisterRoutes(m *http.ServeMux) {
	m.HandleFunc("GET /api/v1/exercises", s.Auth.Require(s.list))
	m.HandleFunc("GET /api/v1/exercises/{id}", s.Auth.Require(s.get))
	m.HandleFunc("POST /api/v1/exercises", s.Auth.Require(s.create))
	m.HandleFunc("PATCH /api/v1/exercises/{id}", s.Auth.Require(s.patch))
}
func (s *Service) get(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, httpx.Fail(404, "not_found"))
		return
	}
	e, err := Load(r.Context(), s.Core.Pool, a.User.ID, r.PathValue("id"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	w.Header().Set("ETag", httpx.ETag(e.Version))
	httpx.JSON(w, 200, e)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
	archived := r.URL.Query().Get("includeArchived")
	if !httpx.Text(q, 0, 120) || (archived != "" && archived != "true" && archived != "false") {
		httpx.Error(w, httpx.Fail(422, "invalid_filter"))
		return
	}
	filter := q + "|" + archived
	limit, after, err := s.Core.Page(r, a.User.ID, "exercises", filter)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	rows, err := s.Core.Pool.Query(r.Context(), `SELECT `+columns+` FROM exercises e WHERE id>$1 AND ($2 OR archived_at IS NULL) AND strpos(normalized_name,$3)>0 ORDER BY id LIMIT $4`, after, archived == "true", q, limit+1)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer rows.Close()
	items := []Exercise{}
	for rows.Next() {
		e, err := scan(rows, a.User.ID)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		items = append(items, e)
	}
	if rows.Err() != nil {
		httpx.Error(w, rows.Err())
		return
	}
	var cursor *string
	if len(items) > limit {
		items = items[:limit]
		v := s.Core.Cursor(a.User.ID, "exercises", filter, items[len(items)-1].ID)
		cursor = &v
	}
	httpx.JSON(w, 200, map[string]any{"items": items, "nextCursor": cursor})
}
func (s *Service) create(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Note string `json:"note"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Name = strings.TrimSpace(in.Name)
	if !httpx.UUID(in.ID) || !httpx.Text(in.Name, 1, 120) || !httpx.Text(in.Note, 0, 10000) {
		httpx.Error(w, httpx.Fail(422, "invalid_exercise"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		e, err := scan(tx.QueryRow(r.Context(), `INSERT INTO exercises AS e(id,user_id,name,normalized_name,note) VALUES($1,$2,$3,$4,$5) RETURNING `+columns, in.ID, a.User.ID, in.Name, strings.ToLower(in.Name), in.Note), a.User.ID)
		if err == nil {
			err = httpx.Change(r.Context(), tx, a.User.ID, "exercise", e.ID, "upsert", e.Version)
		}
		return httpx.Reply(201, e, e.Version), err
	})
}
func (s *Service) patch(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		Name     *string `json:"name"`
		Note     *string `json:"note"`
		Archived *bool   `json:"archived"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	v, err := httpx.Version(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if !httpx.UUID(r.PathValue("id")) || (in.Name == nil && in.Note == nil && in.Archived == nil) {
		httpx.Error(w, httpx.Fail(422, "invalid_exercise"))
		return
	}
	if in.Name != nil {
		n := strings.TrimSpace(*in.Name)
		in.Name = &n
		if !httpx.Text(n, 1, 120) {
			httpx.Error(w, httpx.Fail(422, "invalid_name"))
			return
		}
	}
	if in.Note != nil && !httpx.Text(*in.Note, 0, 10000) {
		httpx.Error(w, httpx.Fail(422, "invalid_note"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		e, err := scan(tx.QueryRow(r.Context(), `SELECT `+columns+` FROM exercises e WHERE e.user_id=$1 AND e.id=$2 FOR UPDATE`, a.User.ID, r.PathValue("id")), a.User.ID)
		if err != nil {
			return httpx.Result{}, err
		}
		if e.Version != v {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		if in.Name != nil {
			e.Name = *in.Name
		}
		if in.Note != nil {
			e.Note = *in.Note
		}
		if in.Archived != nil {
			e.ArchivedAt = nil
			if *in.Archived {
				now := time.Now().UTC()
				e.ArchivedAt = &now
			}
		}
		e, err = scan(tx.QueryRow(r.Context(), `UPDATE exercises AS e SET name=$3,normalized_name=$4,note=$5,archived_at=$6,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING `+columns, a.User.ID, e.ID, e.Name, strings.ToLower(e.Name), e.Note, e.ArchivedAt), a.User.ID)
		if err == nil {
			err = httpx.Change(r.Context(), tx, a.User.ID, "exercise", e.ID, "upsert", e.Version)
		}
		return httpx.Reply(200, e, e.Version), err
	})
}
