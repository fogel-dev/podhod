// Package progress aggregates actual sets from current completed workout revisions.
package progress

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/jackc/pgx/v5"
	"math/big"
	"net/http"
)

type Service struct {
	Core *httpx.Core
	Auth *auth.Service
}
type Point struct {
	From       string   `json:"from"`
	To         string   `json:"to"`
	WorkoutIDs []string `json:"workoutIds"`
	Value      string   `json:"value"`
}
type Summary struct {
	First      *string `json:"first"`
	Last       *string `json:"last"`
	Max        *string `json:"max"`
	Difference *string `json:"difference"`
	Percent    *string `json:"percentChange"`
}
type Progress struct {
	ExerciseID  string  `json:"exerciseId"`
	From        string  `json:"from"`
	To          string  `json:"to"`
	Timezone    string  `json:"timezone"`
	Metric      string  `json:"metric"`
	Bucket      string  `json:"bucket"`
	Units       string  `json:"units"`
	Aggregation string  `json:"aggregation"`
	Points      []Point `json:"points"`
	Summary     Summary `json:"summary"`
	DataCount   int64   `json:"dataCount"`
}

func (s *Service) RegisterRoutes(m *http.ServeMux) {
	m.HandleFunc("GET /api/v1/progress/exercises", s.Auth.Require(s.list))
	m.HandleFunc("GET /api/v1/progress/exercises/{id}", s.Auth.Require(s.get))
}

const facts = ` FROM workouts w JOIN workout_exercises e ON e.user_id=w.user_id AND e.revision_id=w.current_revision_id JOIN workout_sets s ON s.user_id=e.user_id AND s.revision_id=e.revision_id AND s.workout_exercise_id=e.id WHERE w.user_id=$1 AND w.status='completed' AND s.status='completed'`

func (s *Service) list(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	limit, after, e := s.Core.Page(r, a.User.ID, "progress-exercises", "")
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
	rows, e := tx.Query(r.Context(), `SELECT DISTINCT e.exercise_id::text`+facts+` AND e.exercise_id>$2 ORDER BY e.exercise_id::text LIMIT $3`, a.User.ID, after, limit+1)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	ids := []string{}
	for rows.Next() {
		var v string
		if e = rows.Scan(&v); e != nil {
			rows.Close()
			httpx.Error(w, e)
			return
		}
		ids = append(ids, v)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		httpx.Error(w, e)
		return
	}
	var cursor *string
	if len(ids) > limit {
		ids = ids[:limit]
		v := s.Core.Cursor(a.User.ID, "progress-exercises", "", ids[len(ids)-1])
		cursor = &v
	}
	items := []exercises.Exercise{}
	for _, id := range ids {
		x, e := exercises.Load(r.Context(), tx, a.User.ID, id)
		if e != nil {
			httpx.Error(w, e)
			return
		}
		items = append(items, x)
	}
	httpx.JSON(w, 200, map[string]any{"items": items, "nextCursor": cursor})
}
func (s *Service) get(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	q := r.URL.Query()
	for k, v := range q {
		if (k != "from" && k != "to" && k != "metric" && k != "bucket") || len(v) != 1 {
			httpx.Error(w, httpx.Fail(422, "invalid_progress_query"))
			return
		}
	}
	from, e := httpx.Date(q.Get("from"))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	to, e := httpx.Date(q.Get("to"))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	if from.Year() < 1 || to.Before(from) || to.After(from.AddDate(5, 0, 0)) {
		httpx.Error(w, httpx.Fail(422, "invalid_progress_period"))
		return
	}
	eid := r.PathValue("id")
	if !httpx.UUID(eid) {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	metric, bucket := q.Get("metric"), q.Get("bucket")
	if bucket == "" {
		bucket = "session"
	}
	if bucket != "session" && bucket != "week" && bucket != "month" {
		httpx.Error(w, httpx.Fail(422, "invalid_progress_bucket"))
		return
	}
	value, units, aggregate := "", "", "sum"
	digits := 0
	switch metric {
	case "maxWeight":
		value = "max(s.actual_weight_kg)"
		units, aggregate, digits = "kg", "max", 2
	case "completedSets":
		value = "count(*)"
		units = "sets"
	case "totalReps":
		value = "sum(s.actual_reps)"
		units = "reps"
	case "volume":
		value = "sum(s.actual_weight_kg*s.actual_reps)"
		units, digits = "kg_reps", 2
	default:
		httpx.Error(w, httpx.Fail(422, "invalid_progress_metric"))
		return
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	if _, e = exercises.Load(r.Context(), tx, a.User.ID, eid); e != nil {
		httpx.Error(w, e)
		return
	}
	// SQL expressions are selected only from the constants above, never user text.
	date, identity := "local_date", "id"
	if bucket != "session" {
		date = "date_trunc('" + bucket + "',local_date::timestamp)::date"
		identity = "NULL::uuid"
	}
	sql := `WITH sessions AS (SELECT w.id,w.local_date,w.started_at,` + value + ` value` + facts + ` AND e.exercise_id=$2 AND w.local_date BETWEEN $3::date AND $4::date GROUP BY w.id,w.local_date,w.started_at),ranked AS (SELECT *,row_number() OVER(PARTITION BY ` + date + `,` + identity + ` ORDER BY started_at,id) rn FROM sessions) SELECT ` + date + `::text,array_agg(id::text ORDER BY started_at,id) FILTER(WHERE rn<=500),` + aggregate + `(value)::text,count(*)::bigint FROM ranked GROUP BY ` + date + `,` + identity + ` ORDER BY ` + date + `,min(started_at),min(id::text) LIMIT 501`
	rows, e := tx.Query(r.Context(), sql, a.User.ID, eid, from.Format("2006-01-02"), to.Format("2006-01-02"))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer rows.Close()
	result := Progress{ExerciseID: eid, From: from.Format("2006-01-02"), To: to.Format("2006-01-02"), Timezone: a.User.Timezone, Metric: metric, Bucket: bucket, Units: units, Aggregation: aggregate, Points: []Point{}}
	for rows.Next() {
		var p Point
		var n int64
		if e = rows.Scan(&p.From, &p.WorkoutIDs, &p.Value, &n); e != nil {
			httpx.Error(w, e)
			return
		}
		result.DataCount += n
		if result.DataCount > 2147483647 {
			httpx.Error(w, httpx.Fail(422, "too_many_workouts"))
			return
		}
		p.To = p.From
		if bucket != "session" {
			start, _ := httpx.Date(p.From)
			end := start.AddDate(0, 0, 6)
			if bucket == "month" {
				end = start.AddDate(0, 1, -1)
			}
			if start.Before(from) {
				p.From = result.From
			}
			if end.After(to) {
				end = to
			}
			p.To = end.Format("2006-01-02")
		}
		p.Value = number(p.Value, digits)
		result.Points = append(result.Points, p)
	}
	if rows.Err() != nil {
		httpx.Error(w, rows.Err())
		return
	}
	if len(result.Points) > 500 {
		httpx.Error(w, httpx.Fail(422, "too_many_progress_points"))
		return
	}
	result.Summary = summary(result.Points, digits)
	httpx.JSON(w, 200, result)
}
func number(value string, digits int) string {
	r, _ := new(big.Rat).SetString(value)
	return r.FloatString(digits)
}
func summary(points []Point, digits int) Summary {
	var s Summary
	if len(points) == 0 {
		return s
	}
	first, last := points[0].Value, points[len(points)-1].Value
	max := first
	maximum, _ := new(big.Rat).SetString(max)
	for _, p := range points {
		v, _ := new(big.Rat).SetString(p.Value)
		if v.Cmp(maximum) > 0 {
			max = p.Value
			maximum = v
		}
	}
	a, _ := new(big.Rat).SetString(first)
	b, _ := new(big.Rat).SetString(last)
	difference := new(big.Rat).Sub(b, a)
	diff := difference.FloatString(digits)
	s = Summary{First: &first, Last: &last, Max: &max, Difference: &diff}
	if a.Sign() != 0 {
		percent := new(big.Rat).Mul(new(big.Rat).Quo(difference, a), big.NewRat(100, 1)).FloatString(2)
		s.Percent = &percent
	}
	return s
}
