package programs

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"net/http"
)

type Occurrence struct {
	ProgramID   string
	ProgramName string
	Revision    Revision
	SourceDate  string
	PlannedDate string
	Day         Day
}

func base(ctx context.Context, db DB, user, pid, date string) (*Occurrence, error) {
	var revID, name string
	err := db.QueryRow(ctx, `SELECT r.id::text,p.name FROM programs p JOIN LATERAL(SELECT id,start_date,end_date,effective_from FROM program_revisions WHERE program_id=p.id AND user_id=p.user_id AND effective_from<=$3::date ORDER BY effective_from DESC,revision_no DESC LIMIT 1) r ON true WHERE p.user_id=$1 AND p.id=$2 AND $3::date BETWEEN r.start_date AND r.end_date AND (p.archived_from IS NULL OR $3::date<p.archived_from)`, user, pid, date).Scan(&revID, &name)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	rev, err := LoadRevision(ctx, db, user, pid, revID)
	if err != nil {
		return nil, err
	}
	t, err := httpx.Date(date)
	if err != nil {
		return nil, err
	}
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	for _, d := range rev.Days {
		if d.Weekday == weekday {
			return &Occurrence{pid, name, rev, date, date, d}, nil
		}
	}
	return nil, nil
}

// At applies exceptions to the original occurrence, never duplicating a moved day.
func At(ctx context.Context, db DB, user, date string) ([]Occurrence, error) {
	if _, err := httpx.Date(date); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT id::text FROM programs WHERE user_id=$1`, user)
	if err != nil {
		return nil, err
	}
	ids := []string{}
	for rows.Next() {
		var pid string
		if err = rows.Scan(&pid); err != nil {
			break
		}
		ids = append(ids, pid)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return nil, err
	}
	out := []Occurrence{}
	for _, pid := range ids {
		o, err := base(ctx, db, user, pid, date)
		if err != nil {
			return nil, err
		}
		if o != nil {
			var except bool
			if err = db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schedule_exceptions WHERE user_id=$1 AND program_id=$2 AND source_date=$3::date)`, user, pid, date).Scan(&except); err != nil {
				return nil, err
			}
			if !except {
				out = append(out, *o)
			}
		}
	}
	rows, err = db.Query(ctx, `SELECT program_id::text,source_date::text FROM schedule_exceptions WHERE user_id=$1 AND target_date=$2::date AND action='move' ORDER BY program_id,source_date`, user, date)
	if err != nil {
		return nil, err
	}
	type source struct{ pid, date string }
	moves := []source{}
	for rows.Next() {
		var m source
		if err = rows.Scan(&m.pid, &m.date); err != nil {
			break
		}
		moves = append(moves, m)
	}
	if err == nil {
		err = rows.Err()
	}
	rows.Close()
	if err != nil {
		return nil, err
	}
	for _, m := range moves {
		o, err := base(ctx, db, user, m.pid, m.date)
		if err != nil {
			return nil, err
		}
		if o != nil {
			o.PlannedDate = date
			out = append(out, *o)
		}
	}
	return out, nil
}
func validateExceptions(ctx context.Context, tx pgx.Tx, user, pid string) error {
	p, err := Load(ctx, tx, user, pid)
	if err != nil {
		return err
	}
	for _, x := range p.Exceptions {
		if x.SourceDate < Today(p.CurrentRevision.Timezone) {
			continue
		}
		o, err := base(ctx, tx, user, pid, x.SourceDate)
		if err != nil {
			return err
		}
		if o == nil {
			return httpx.Fail(409, "exception_no_longer_valid")
		}
		if x.TargetDate != nil {
			if *x.TargetDate < Today(o.Revision.Timezone) || *x.TargetDate < o.Revision.StartDate || *x.TargetDate > o.Revision.EndDate || p.ArchivedFrom != nil && *x.TargetDate >= *p.ArchivedFrom {
				return httpx.Fail(409, "invalid_move_target")
			}
			plans, err := At(ctx, tx, user, *x.TargetDate)
			if err != nil {
				return err
			}
			if len(plans) != 1 || plans[0].ProgramID != pid || plans[0].SourceDate != x.SourceDate {
				return httpx.Fail(409, "schedule_date_occupied")
			}
		}
	}
	return nil
}
func (s *Service) exception(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ExpectedVersion int64   `json:"expectedVersion"`
		Action          string  `json:"action"`
		TargetDate      *string `json:"targetDate"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	source := r.PathValue("sourceDate")
	if _, err := httpx.Date(source); err != nil {
		httpx.Error(w, err)
		return
	}
	if in.Action != "move" && in.Action != "cancel" || in.Action == "move" && in.TargetDate == nil || in.Action == "cancel" && in.TargetDate != nil {
		httpx.Error(w, httpx.Fail(422, "invalid_exception"))
		return
	}
	if in.TargetDate != nil {
		if _, err := httpx.Date(*in.TargetDate); err != nil {
			httpx.Error(w, err)
			return
		}
		if *in.TargetDate == source {
			httpx.Error(w, httpx.Fail(422, "invalid_move_target"))
			return
		}
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		p, err := current(r.Context(), tx, a.User.ID, r.PathValue("id"), in.ExpectedVersion)
		if err != nil {
			return httpx.Result{}, err
		}
		if source < Today(p.CurrentRevision.Timezone) || len(p.Exceptions) >= 1000 {
			return httpx.Result{}, httpx.Fail(409, "invalid_exception")
		}
		o, err := base(r.Context(), tx, a.User.ID, p.ID, source)
		if err != nil {
			return httpx.Result{}, err
		}
		if o == nil {
			return httpx.Result{}, httpx.Fail(409, "not_a_scheduled_date")
		}
		_, err = tx.Exec(r.Context(), `INSERT INTO schedule_exceptions(user_id,program_id,source_date,action,target_date) VALUES($1,$2,$3,$4,$5) ON CONFLICT(program_id,source_date) DO UPDATE SET action=EXCLUDED.action,target_date=EXCLUDED.target_date`, a.User.ID, p.ID, source, in.Action, in.TargetDate)
		if err == nil {
			err = validateExceptions(r.Context(), tx, a.User.ID, p.ID)
		}
		if err != nil {
			return httpx.Result{}, err
		}
		_, err = tx.Exec(r.Context(), `UPDATE programs SET version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, a.User.ID, p.ID)
		if err != nil {
			return httpx.Result{}, err
		}
		return finish(r.Context(), tx, a.User.ID, p.ID, 200)
	})
}
func (s *Service) deleteException(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	version, err := httpx.Version(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	source := r.PathValue("sourceDate")
	if _, err = httpx.Date(source); err != nil {
		httpx.Error(w, err)
		return
	}
	s.Core.Rest(w, r, a, struct{}{}, func(tx pgx.Tx) (httpx.Result, error) {
		p, err := current(r.Context(), tx, a.User.ID, r.PathValue("id"), version)
		if err != nil {
			return httpx.Result{}, err
		}
		if source < Today(p.CurrentRevision.Timezone) {
			return httpx.Result{}, httpx.Fail(409, "past_schedule_immutable")
		}
		tag, err := tx.Exec(r.Context(), `DELETE FROM schedule_exceptions WHERE user_id=$1 AND program_id=$2 AND source_date=$3::date`, a.User.ID, p.ID, source)
		if err != nil {
			return httpx.Result{}, err
		}
		if tag.RowsAffected() == 0 {
			return httpx.Result{}, pgx.ErrNoRows
		}
		if err = validateExceptions(r.Context(), tx, a.User.ID, p.ID); err != nil {
			return httpx.Result{}, err
		}
		plans, err := At(r.Context(), tx, a.User.ID, source)
		if err != nil {
			return httpx.Result{}, err
		}
		if len(plans) > 1 {
			return httpx.Result{}, httpx.Fail(409, "schedule_date_occupied")
		}
		_, err = tx.Exec(r.Context(), `UPDATE programs SET version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, a.User.ID, p.ID)
		if err == nil {
			_, err = finish(r.Context(), tx, a.User.ID, p.ID, 200)
		}
		return httpx.Reply(204, nil, version+1), err
	})
}
