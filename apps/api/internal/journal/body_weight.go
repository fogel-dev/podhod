package journal

import (
	"context"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/jackc/pgx/v5"
)

type BodyWeight struct {
	LocalDate string    `json:"localDate"`
	WeightKg  string    `json:"weightKg"`
	Version   int64     `json:"version"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

const weightColumns = `local_date::text,weight_kg::text,version,created_at,updated_at`

func scanWeight(row pgx.Row) (BodyWeight, error) {
	var value BodyWeight
	err := row.Scan(&value.LocalDate, &value.WeightKg, &value.Version, &value.CreatedAt, &value.UpdatedAt)
	return value, err
}

var weightPattern = regexp.MustCompile(`^[0-9]{1,3}(\.[0-9]{1,2})?$`)

func validWeight(value string) bool {
	if !weightPattern.MatchString(value) {
		return false
	}
	n, err := strconv.ParseFloat(value, 64)
	return err == nil && n > 0 && n <= 500
}
func (s *Service) putBodyWeight(w http.ResponseWriter, r *http.Request, a auth.Actor) {
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
		WeightKg string `json:"weightKg"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !validWeight(in.WeightKg) {
		httpx.Error(w, httpx.Fail(422, "invalid_body_weight"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		if date != programs.Today(a.User.Timezone) {
			return httpx.Result{}, httpx.Fail(422, "body_weight_today_only")
		}
		if _, err := tx.Exec(r.Context(), `SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, "body-weight:"+a.User.ID+":"+date); err != nil {
			return httpx.Result{}, err
		}
		current, err := scanWeight(tx.QueryRow(r.Context(), `SELECT `+weightColumns+` FROM body_weights WHERE user_id=$1 AND local_date=$2::date FOR UPDATE`, a.User.ID, date))
		var value BodyWeight
		if errors.Is(err, pgx.ErrNoRows) {
			if version != 0 {
				return httpx.Result{}, httpx.Fail(409, "version_conflict")
			}
			value, err = scanWeight(tx.QueryRow(r.Context(), `INSERT INTO body_weights(user_id,local_date,weight_kg) VALUES($1,$2,$3) RETURNING `+weightColumns, a.User.ID, date, in.WeightKg))
		} else if err == nil {
			if version != current.Version {
				return httpx.Result{}, httpx.Fail(409, "version_conflict")
			}
			value, err = scanWeight(tx.QueryRow(r.Context(), `UPDATE body_weights SET weight_kg=$3,version=version+1,updated_at=now() WHERE user_id=$1 AND local_date=$2::date RETURNING `+weightColumns, a.User.ID, date, in.WeightKg))
		}
		if err != nil {
			return httpx.Result{}, err
		}
		return httpx.Reply(200, value, value.Version), nil
	})
}
func (s *Service) bodyWeightHistory(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	from, err := httpx.Date(r.URL.Query().Get("from"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	to, err := httpx.Date(r.URL.Query().Get("to"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if to.Before(from) || to.Sub(from) > 365*24*time.Hour {
		httpx.Error(w, httpx.Fail(422, "invalid_date_range"))
		return
	}
	tx, err := s.Core.Read(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	rows, err := tx.Query(r.Context(), `SELECT `+weightColumns+` FROM body_weights WHERE user_id=$1 AND local_date BETWEEN $2::date AND $3::date ORDER BY local_date`, a.User.ID, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	defer rows.Close()
	items := []BodyWeight{}
	for rows.Next() {
		value, err := scanWeight(rows)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		items = append(items, value)
	}
	if err = rows.Err(); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, 200, struct {
		Items []BodyWeight `json:"items"`
	}{items})
}
