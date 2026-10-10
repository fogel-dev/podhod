package progress

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/fogel-dev/podhod/apps/api/internal/workouts"
	"testing"
	"time"
)

func command(t *testing.T, a *domaintest.App, c domaintest.Client, w workouts.Workout, kind string, in any, at time.Time) workouts.Workout {
	t.Helper()
	b, e := json.Marshal(in)
	if e != nil {
		t.Fatal(e)
	}
	cmd := workouts.Command{CommandID: id.New(), DeviceID: c.Session.DeviceID, AggregateID: w.ID, ExpectedVersion: w.Version, OccurredAt: at, Type: kind, Payload: b}
	r := a.Request(c, "POST", "/api/v1/workouts/"+w.ID+"/commands", cmd, "", "")
	domaintest.Status(t, r, 200)
	var reply struct{ Aggregate workouts.Workout }
	domaintest.Decode(t, r, &reply)
	return reply.Aggregate
}
func session(t *testing.T, a *domaintest.App, c domaintest.Client, eid, weight string, reps int, at time.Time, finish string) workouts.Workout {
	t.Helper()
	target := programs.Target{ID: id.New(), Position: 1, WeightKg: &weight, RepsMin: reps, RepsMax: reps}
	second := programs.Target{ID: id.New(), Position: 2, WeightKg: &weight, RepsMin: reps, RepsMax: reps}
	in := workouts.Start{ID: id.New(), LocalDate: at.Format("2006-01-02"), Timezone: "UTC", StartedAt: at, Exercises: []programs.InputExercise{{ID: id.New(), ExerciseID: eid, Position: 1, Targets: []programs.Target{target, second}}}}
	r := a.Write(c, "POST", "/api/v1/workouts", in, 0)
	domaintest.Status(t, r, 201)
	var w workouts.Workout
	domaintest.Decode(t, r, &w)
	w = command(t, a, c, w, "complete_set", map[string]any{"setId": target.ID, "actualWeightKg": weight, "actualReps": reps, "completedAt": at.Add(10 * time.Second)}, at.Add(10*time.Second))
	switch finish {
	case "completed":
		w = command(t, a, c, w, "finish_workout", map[string]any{"finishedAt": at.Add(20 * time.Second), "skipRemaining": true}, at.Add(20*time.Second))
	case "discarded":
		w = command(t, a, c, w, "discard_workout", map[string]any{}, at.Add(20*time.Second))
	}
	return w
}
func graph(t *testing.T, a *domaintest.App, c domaintest.Client, eid, from, to, metric, bucket string) Progress {
	t.Helper()
	r := a.Request(c, "GET", fmt.Sprintf("/api/v1/progress/exercises/%s?from=%s&to=%s&metric=%s&bucket=%s", eid, from, to, metric, bucket), nil, "", "")
	domaintest.Status(t, r, 200)
	var p Progress
	domaintest.Decode(t, r, &p)
	return p
}
func TestProgressUsesOnlyCurrentCompletedFacts(t *testing.T) {
	a := domaintest.New(t)
	(&Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	(&exercises.Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	(&workouts.Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	c := a.User(t, "progress")
	other := a.User(t, "otherprogress")
	eid, variant, empty := id.New(), id.New(), id.New()
	for _, e := range []string{eid, variant, empty} {
		domaintest.Status(t, a.Write(c, "POST", "/api/v1/exercises", map[string]any{"id": e, "name": "Жим"}, 0), 201)
	}
	// Two sessions in the same ISO week, and a separate exercise variant.
	start := time.Now().UTC().AddDate(0, 0, -20)
	for start.Weekday() != time.Monday {
		start = start.AddDate(0, 0, -1)
	}
	if start.Day() > 25 {
		start = start.AddDate(0, 0, -7)
	}
	start = time.Date(start.Year(), start.Month(), start.Day(), 12, 0, 0, 0, time.UTC)
	first := session(t, a, c, eid, "40.00", 10, start, "completed")
	second := session(t, a, c, eid, "50.00", 8, start.AddDate(0, 0, 1), "completed")
	session(t, a, c, variant, "99.99", 50, start.AddDate(0, 0, 2), "completed")
	session(t, a, c, eid, "90.00", 100, start.AddDate(0, 0, 3), "discarded")
	session(t, a, c, eid, "95.00", 100, start.AddDate(0, 0, 4), "active")
	from, to := start.AddDate(0, 0, -1).Format("2006-01-02"), start.AddDate(0, 0, 7).Format("2006-01-02")
	want := map[string][]string{"maxWeight": {"40.00", "50.00"}, "completedSets": {"1", "1"}, "totalReps": {"10", "8"}, "volume": {"400.00", "400.00"}}
	for metric, values := range want {
		p := graph(t, a, c, eid, from, to, metric, "session")
		if len(p.Points) != 2 || p.DataCount != 2 || p.Points[0].Value != values[0] || p.Points[1].Value != values[1] || p.Points[0].WorkoutIDs[0] != first.ID || p.Points[1].WorkoutIDs[0] != second.ID {
			t.Fatal(metric, p)
		}
	}
	for metric, value := range map[string]string{"maxWeight": "50.00", "completedSets": "2", "totalReps": "18", "volume": "800.00"} {
		for _, bucket := range []string{"week", "month"} {
			p := graph(t, a, c, eid, from, to, metric, bucket)
			if len(p.Points) != 1 || p.Points[0].Value != value || len(p.Points[0].WorkoutIDs) != 2 || p.DataCount != 2 {
				t.Fatal(metric, bucket, p)
			}
		}
	}
	xs := first.CurrentRevision.Exercises
	newWeight, newReps := "60.00", 12
	xs[0].Sets[0].ActualWeightKg = &newWeight
	xs[0].Sets[0].ActualReps = &newReps
	command(t, a, c, first, "correct_result", map[string]any{"reason": "Исправление", "startedAt": first.StartedAt, "finishedAt": first.FinishedAt, "exercises": xs, "restIntervals": first.CurrentRevision.RestIntervals}, time.Now().UTC())
	p := graph(t, a, c, eid, from, to, "volume", "session")
	if p.Points[0].Value != "720.00" || *p.Summary.Difference != "-320.00" || *p.Summary.Percent != "-44.44" {
		t.Fatal(p)
	}
	p = graph(t, a, c, eid, from, to, "volume", "week")
	if p.Points[0].Value != "1120.00" {
		t.Fatal("old revision counted", p)
	}
	p = graph(t, a, c, empty, from, to, "maxWeight", "session")
	if len(p.Points) != 0 || p.Summary.First != nil || p.Summary.Percent != nil || p.DataCount != 0 {
		t.Fatal(p)
	}
	domaintest.Status(t, a.Request(c, "PATCH", "/api/v1/me", map[string]any{"timezone": "Pacific/Auckland"}, "", `"1"`), 200)
	p = graph(t, a, c, eid, from, to, "volume", "session")
	if p.Timezone != "Pacific/Auckland" || p.Points[0].From != first.LocalDate {
		t.Fatal("history dates shifted with timezone", p)
	}
	r := a.Request(c, "GET", "/api/v1/progress/exercises?limit=1", nil, "", "")
	domaintest.Status(t, r, 200)
	var page struct {
		Items      []exercises.Exercise
		NextCursor *string
	}
	domaintest.Decode(t, r, &page)
	if len(page.Items) != 1 || page.NextCursor == nil {
		t.Fatal(page)
	}
	r = a.Request(c, "GET", "/api/v1/progress/exercises?limit=1&cursor="+*page.NextCursor, nil, "", "")
	domaintest.Status(t, r, 200)
	domaintest.Decode(t, r, &page)
	if len(page.Items) != 1 {
		t.Fatal(page)
	}
	sharedProgress := a.Request(other, "GET", "/api/v1/progress/exercises/"+eid+"?from="+from+"&to="+to+"&metric=volume", nil, "", "")
	domaintest.Status(t, sharedProgress, 200)
	var privateProgress Progress
	domaintest.Decode(t, sharedProgress, &privateProgress)
	if privateProgress.DataCount != 0 || len(privateProgress.Points) != 0 {
		t.Fatal("shared library leaked another user's workout facts")
	}
	for _, q := range []string{"from=2020-01-01&to=2026-01-01&metric=volume", "from=2026-01-02&to=2026-01-01&metric=volume", "from=2026-01-01&to=2026-01-02&metric=plannedWeight", "from=2026-01-01&to=2026-01-02&metric=volume&bucket=day"} {
		domaintest.Status(t, a.Request(c, "GET", "/api/v1/progress/exercises/"+eid+"?"+q, nil, "", ""), 422)
	}
}
func TestSummaryExactDecimalZeroSparseAndDecrease(t *testing.T) {
	for _, in := range []struct {
		first, last, difference string
		percent                 *string
	}{{"0.00", "10.00", "10.00", nil}, {"1.25", "0.00", "-1.25", pointer("-100.00")}, {"0.10", "0.30", "0.20", pointer("200.00")}} {
		s := summary([]Point{{Value: in.first}, {Value: in.last}}, 2)
		if *s.Difference != in.difference || (s.Percent == nil) != (in.percent == nil) || (s.Percent != nil && *s.Percent != *in.percent) {
			t.Fatal(in, s)
		}
	}
	s := summary([]Point{{Value: "42.50"}}, 2)
	if *s.Difference != "0.00" || *s.Percent != "0.00" {
		t.Fatal(s)
	}
}
func pointer(s string) *string { return &s }
func TestProgressPointLimit(t *testing.T) {
	a := domaintest.New(t)
	(&Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	(&exercises.Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	(&workouts.Service{Core: a.Core, Auth: a.Auth}).RegisterRoutes(a.Mux)
	c := a.User(t, "pointlimit")
	eid := id.New()
	domaintest.Status(t, a.Write(c, "POST", "/api/v1/exercises", map[string]any{"id": eid, "name": "Тяга"}, 0), 201)
	at := time.Now().UTC().Add(-time.Hour)
	base := session(t, a, c, eid, "10.00", 2, at, "completed")
	ctx := context.Background()
	tx, e := a.Core.Pool.Begin(ctx)
	if e != nil {
		t.Fatal(e)
	}
	defer tx.Rollback(ctx)
	// Real relational fixtures copy one sealed result through unsealed revisions.
	for range 500 {
		wid, rid, xid, sid := id.New(), id.New(), id.New(), id.New()
		_, e = tx.Exec(ctx, `INSERT INTO workouts(id,user_id,local_date,timezone,status,started_at,finished_at,current_revision_id) SELECT $1,user_id,local_date,timezone,status,started_at,finished_at,$2 FROM workouts WHERE id=$3`, wid, rid, base.ID)
		if e != nil {
			t.Fatal(e)
		}
		_, e = tx.Exec(ctx, `INSERT INTO workout_revisions(id,user_id,workout_id,revision_no,started_at,finished_at) SELECT $1,user_id,$2,1,started_at,finished_at FROM workout_revisions WHERE id=$3`, rid, wid, base.CurrentRevision.ID)
		if e != nil {
			t.Fatal(e)
		}
		_, e = tx.Exec(ctx, `INSERT INTO workout_exercises(id,user_id,revision_id,exercise_id,position,name_snapshot,note) SELECT $1,user_id,$2,exercise_id,1,name_snapshot,note FROM workout_exercises WHERE revision_id=$3`, xid, rid, base.CurrentRevision.ID)
		if e != nil {
			t.Fatal(e)
		}
		_, e = tx.Exec(ctx, `INSERT INTO workout_sets(id,user_id,revision_id,workout_exercise_id,position,status,actual_weight_kg,actual_reps,completed_at) SELECT $1,user_id,$2,$3,1,status,actual_weight_kg,actual_reps,completed_at FROM workout_sets WHERE revision_id=$4 AND status='completed'`, sid, rid, xid, base.CurrentRevision.ID)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = tx.Exec(ctx, `UPDATE workout_revisions SET sealed=true WHERE id=$1`, rid); e != nil {
			t.Fatal(e)
		}
	}
	if e = tx.Commit(ctx); e != nil {
		t.Fatal(e)
	}
	date := at.Format("2006-01-02")
	r := a.Request(c, "GET", "/api/v1/progress/exercises/"+eid+"?from="+date+"&to="+date+"&metric=volume", nil, "", "")
	domaintest.Status(t, r, 422)
	r = a.Request(c, "GET", "/api/v1/progress/exercises/"+eid+"?from="+date+"&to="+date+"&metric=volume&bucket=month", nil, "", "")
	domaintest.Status(t, r, 200)
	var p Progress
	domaintest.Decode(t, r, &p)
	if p.DataCount != 501 || len(p.Points) != 1 || len(p.Points[0].WorkoutIDs) != 500 || p.Points[0].Value != "10020.00" {
		t.Fatal("bucket truncated actual metrics", p)
	}
}
