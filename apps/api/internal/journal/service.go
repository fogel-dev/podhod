package journal

import (
	"context"
	"errors"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/media"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/fogel-dev/podhod/apps/api/internal/workouts"
	"github.com/jackc/pgx/v5"
	"net/http"
	"time"
)

type Note struct {
	ID        string    `json:"id"`
	Version   int64     `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
	LocalDate string    `json:"localDate"`
	Body      string    `json:"body"`
}
type Plan struct {
	ProgramID         string `json:"programId"`
	ProgramRevisionID string `json:"programRevisionId"`
	SourceDate        string `json:"sourceDate"`
	Date              string `json:"date"`
	Status            string `json:"status"`
}
type Day struct {
	Date     string             `json:"date"`
	Plans    []Plan             `json:"plans"`
	Workouts []workouts.Workout `json:"workouts"`
	Note     *Note              `json:"note"`
	Photos   media.Page         `json:"photos"`
}
type CalendarDay struct {
	Date              string             `json:"date"`
	Plans             []Plan             `json:"plans"`
	WorkoutSummaries  []workouts.Workout `json:"workoutSummaries"`
	NotePresent       bool               `json:"notePresent"`
	PhotoCount        int                `json:"photoCount"`
	ThumbnailPhotoIDs []string           `json:"thumbnailPhotoIds"`
}
type Service struct {
	Core *httpx.Core
	Auth *auth.Service
}

func (s *Service) RegisterRoutes(m *http.ServeMux) {
	for pattern, fn := range map[string]func(http.ResponseWriter, *http.Request, auth.Actor){"GET /api/v1/calendar": s.calendar, "GET /api/v1/days/{date}": s.day, "PUT /api/v1/days/{date}/note": s.putNote, "DELETE /api/v1/days/{date}/note": s.deleteNote} {
		m.HandleFunc(pattern, s.Auth.Require(fn))
	}
}

const noteColumns = `id::text,version,created_at,updated_at,local_date::text,body`

func scanNote(row pgx.Row) (Note, error) {
	var n Note
	err := row.Scan(&n.ID, &n.Version, &n.CreatedAt, &n.UpdatedAt, &n.LocalDate, &n.Body)
	return n, err
}
func loadDay(ctx context.Context, db programs.DB, user, date string) (Day, error) {
	day := Day{Date: date, Plans: []Plan{}, Workouts: []workouts.Workout{}}
	occurrences, err := programs.At(ctx, db, user, date)
	if err != nil {
		return day, err
	}
	for _, o := range occurrences {
		status := "planned"
		if date < programs.Today(o.Revision.Timezone) {
			status = "missed"
		}
		var actual string
		err = db.QueryRow(ctx, `SELECT status FROM workouts WHERE user_id=$1 AND program_id=$2 AND scheduled_date=$3::date AND status<>'discarded'`, user, o.ProgramID, o.SourceDate).Scan(&actual)
		if err == nil {
			if actual == "completed" {
				status = "completed"
			} else {
				status = "started"
			}
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return day, err
		}
		day.Plans = append(day.Plans, Plan{o.ProgramID, o.Revision.ID, o.SourceDate, date, status})
	}
	rows, err := db.Query(ctx, `SELECT x.program_id::text,x.source_date::text,x.action,x.target_date::text FROM schedule_exceptions x WHERE user_id=$1 AND source_date=$2::date ORDER BY program_id`, user, date)
	if err != nil {
		return day, err
	}
	exceptions := []Plan{}
	for rows.Next() {
		var p Plan
		var action string
		var target *string
		if err = rows.Scan(&p.ProgramID, &p.SourceDate, &action, &target); err != nil {
			break
		}
		p.Date = date
		p.Status = "cancelled"
		if action == "move" {
			p.Status = "moved"
			if target != nil {
				p.Date = *target
			}
		}
		exceptions = append(exceptions, p)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return day, err
	}
	for _, p := range exceptions {
		if err = db.QueryRow(ctx, `SELECT id::text FROM program_revisions WHERE user_id=$1 AND program_id=$2 AND effective_from<=$3::date ORDER BY effective_from DESC,revision_no DESC LIMIT 1`, user, p.ProgramID, date).Scan(&p.ProgramRevisionID); err != nil {
			return day, err
		}
		day.Plans = append(day.Plans, p)
	}
	rows, err = db.Query(ctx, `SELECT id::text FROM workouts WHERE user_id=$1 AND local_date=$2::date AND status<>'discarded' ORDER BY started_at,id LIMIT 100`, user, date)
	if err != nil {
		return day, err
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
		return day, err
	}
	for _, wid := range ids {
		w, err := workouts.Load(ctx, db, user, wid)
		if err != nil {
			return day, err
		}
		day.Workouts = append(day.Workouts, w)
	}
	n, err := scanNote(db.QueryRow(ctx, `SELECT `+noteColumns+` FROM day_notes WHERE user_id=$1 AND local_date=$2::date AND deleted_at IS NULL`, user, date))
	if err == nil {
		day.Note = &n
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return day, err
	}
	day.Photos, err = media.Day(ctx, db, user, date)
	return day, err
}
func (s *Service) day(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	date := r.PathValue("date")
	if _, err := httpx.Date(date); err != nil {
		httpx.Error(w, err)
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	value, err := loadDay(r.Context(), tx, a.User.ID, date)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, 200, value)
}
func (s *Service) calendar(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	month := r.URL.Query().Get("month")
	start, err := time.Parse("2006-01", month)
	if err != nil || start.Format("2006-01") != month {
		httpx.Error(w, httpx.Fail(422, "invalid_month"))
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	days := []CalendarDay{}
	end := start.AddDate(0, 1, 0)
	for date := start; date.Before(end); date = date.AddDate(0, 0, 1) {
		day, err := loadDay(r.Context(), tx, a.User.ID, date.Format("2006-01-02"))
		if err != nil {
			httpx.Error(w, err)
			return
		}
		thumbs := []string{}
		for _, p := range day.Photos.Items {
			if p.Status == "ready" && len(thumbs) < 2 {
				thumbs = append(thumbs, p.ID)
			}
		}
		days = append(days, CalendarDay{day.Date, day.Plans, day.Workouts, day.Note != nil, len(day.Photos.Items), thumbs})
	}
	httpx.JSON(w, 200, map[string]any{"month": month, "timezone": a.User.Timezone, "days": days})
}
func (s *Service) putNote(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	date := r.PathValue("date")
	if _, err := httpx.Date(date); err != nil {
		httpx.Error(w, err)
		return
	}
	version, err := httpx.Version(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var in struct {
		Body *string `json:"body"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.Body == nil || !httpx.Text(*in.Body, 0, 10000) {
		httpx.Error(w, httpx.Fail(422, "invalid_note"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		n, err := scanNote(tx.QueryRow(r.Context(), `SELECT `+noteColumns+` FROM day_notes WHERE user_id=$1 AND local_date=$2::date`, a.User.ID, date))
		status := 200
		if errors.Is(err, pgx.ErrNoRows) {
			if version != 0 {
				return httpx.Result{}, httpx.Fail(409, "version_conflict")
			}
			n, err = scanNote(tx.QueryRow(r.Context(), `INSERT INTO day_notes(id,user_id,local_date,body) VALUES($1,$2,$3,$4) RETURNING `+noteColumns, id.New(), a.User.ID, date, *in.Body))
		} else if err == nil {
			var deleted bool
			if err = tx.QueryRow(r.Context(), `SELECT deleted_at IS NOT NULL FROM day_notes WHERE user_id=$1 AND id=$2`, a.User.ID, n.ID).Scan(&deleted); err != nil {
				return httpx.Result{}, err
			}
			if n.Version != version && !(version == 0 && deleted) {
				return httpx.Result{}, httpx.Fail(409, "version_conflict")
			}
			n, err = scanNote(tx.QueryRow(r.Context(), `UPDATE day_notes SET body=$3,deleted_at=NULL,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING `+noteColumns, a.User.ID, n.ID, *in.Body))
		}
		if err == nil {
			err = httpx.Change(r.Context(), tx, a.User.ID, "day_note", n.ID, "upsert", n.Version)
		}
		return httpx.Reply(status, n, n.Version), err
	})
}
func (s *Service) deleteNote(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	date := r.PathValue("date")
	if _, err := httpx.Date(date); err != nil {
		httpx.Error(w, err)
		return
	}
	version, err := httpx.Version(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	s.Core.Rest(w, r, a, struct{}{}, func(tx pgx.Tx) (httpx.Result, error) {
		n, err := scanNote(tx.QueryRow(r.Context(), `SELECT `+noteColumns+` FROM day_notes WHERE user_id=$1 AND local_date=$2::date AND deleted_at IS NULL`, a.User.ID, date))
		if err != nil {
			return httpx.Result{}, err
		}
		if n.Version != version {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		_, err = tx.Exec(r.Context(), `UPDATE day_notes SET deleted_at=now(),body='',version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, a.User.ID, n.ID)
		if err == nil {
			err = httpx.Change(r.Context(), tx, a.User.ID, "day_note", n.ID, "delete", n.Version+1)
		}
		return httpx.Reply(204, nil, n.Version+1), err
	})
}
