package workouts

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"sync"
	"testing"
	"time"
)

func setup(t *testing.T) (*domaintest.App, domaintest.Client, Start) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	(&exercises.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "first")
	eid := id.New()
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/exercises", map[string]any{"id": eid, "name": "Жим"}, 0), 201)
	start := time.Now().UTC().Add(-2 * time.Minute).Truncate(time.Second)
	weight := "42.50"
	in := Start{ID: id.New(), LocalDate: start.Format("2006-01-02"), Timezone: "UTC", StartedAt: start, Exercises: []programs.InputExercise{{ID: id.New(), ExerciseID: eid, Position: 1, Note: "", Targets: []programs.Target{{ID: id.New(), Position: 1, WeightKg: &weight, RepsMin: 8, RepsMax: 10}, {ID: id.New(), Position: 2, WeightKg: &weight, RepsMin: 8, RepsMax: 10}}}}}
	return app, a, in
}
func send(t *testing.T, app *domaintest.App, a domaintest.Client, w Workout, kind string, payload any, at time.Time, status int) Workout {
	t.Helper()
	data, _ := json.Marshal(payload)
	cmd := Command{id.New(), a.Session.DeviceID, w.ID, w.Version, at, kind, data}
	response := app.Request(a, "POST", "/api/v1/workouts/"+w.ID+"/commands", cmd, "", "")
	domaintest.Status(t, response, status)
	if status != 200 {
		return w
	}
	var result struct{ Aggregate Workout }
	domaintest.Decode(t, response, &result)
	return result.Aggregate
}
func TestWorkoutFactsRestUndoFinishAndSealing(t *testing.T) {
	app, a, in := setup(t)
	b := app.User(t, "second")
	key := id.New()
	response := app.Request(a, "POST", "/api/v1/workouts", in, key, "")
	domaintest.Status(t, response, 201)
	var w Workout
	domaintest.Decode(t, response, &w)
	domaintest.Status(t, app.Request(a, "POST", "/api/v1/workouts", in, key, ""), 201)
	domaintest.Status(t, app.Request(b, "GET", "/api/v1/workouts/"+w.ID, nil, "", ""), 404)
	s1, s2 := in.Exercises[0].Targets[0].ID, in.Exercises[0].Targets[1].ID
	at := func(sec int) time.Time { return in.StartedAt.Add(time.Duration(sec) * time.Second) }
	w = send(t, app, a, w, "complete_set", map[string]any{"setId": s1, "actualWeightKg": "45.00", "actualReps": 10, "completedAt": at(10)}, at(10), 200)
	if len(w.CurrentRevision.RestIntervals) != 1 || w.CurrentRevision.RestIntervals[0].EndedAt != nil {
		t.Fatal("rest not opened")
	}
	w = send(t, app, a, w, "undo_last_set", map[string]any{"setId": s1}, at(11), 200)
	if len(w.CurrentRevision.RestIntervals) != 0 || w.CurrentRevision.Exercises[0].Sets[0].Status != "pending" {
		t.Fatal("undo failed")
	}
	w = send(t, app, a, w, "complete_set", map[string]any{"setId": s1, "actualWeightKg": "45.00", "actualReps": 10, "completedAt": at(12)}, at(12), 200)
	w = send(t, app, a, w, "begin_set", map[string]any{"setId": s2, "startedAt": at(22)}, at(22), 200)
	w = send(t, app, a, w, "undo_last_set", map[string]any{"setId": s1}, at(23), 409)
	w = send(t, app, a, w, "complete_set", map[string]any{"setId": s2, "actualWeightKg": "50.00", "actualReps": 5, "completedAt": at(32)}, at(32), 200)
	data, _ := json.Marshal(map[string]any{"finishedAt": at(42), "skipRemaining": false})
	cmd := Command{id.New(), a.Session.DeviceID, w.ID, w.Version, at(42), "finish_workout", data}
	response = app.Request(a, "POST", "/api/v1/workouts/"+w.ID+"/commands", cmd, "", "")
	domaintest.Status(t, response, 200)
	var result struct{ Aggregate Workout }
	domaintest.Decode(t, response, &result)
	w = result.Aggregate
	if w.Status != "completed" || w.Summary.Volume != "700.00" || w.Summary.TotalRestSeconds != 20 || w.Summary.MeanBetweenSetRestSeconds == nil || *w.Summary.MeanBetweenSetRestSeconds != 10 || w.Summary.DurationSeconds != 42 {
		t.Fatal(w.Summary)
	}
	domaintest.Status(t, app.Request(a, "POST", "/api/v1/workouts/"+w.ID+"/commands", cmd, "", ""), 200)
	if _, err := app.Core.Pool.Exec(context.Background(), `UPDATE workout_sets SET actual_reps=99 WHERE user_id=$1 AND revision_id=$2`, a.Session.User.ID, w.CurrentRevision.ID); err == nil {
		t.Fatal("sealed facts editable")
	}
	response = app.Request(a, "GET", "/api/v1/workouts/active", nil, "", "")
	domaintest.Status(t, response, 200)
	if response.Body.String() != "null\n" {
		t.Fatal(response.Body.String())
	}
}
func TestConcurrentStartAndSkipConfirmation(t *testing.T) {
	app, a, in := setup(t)
	var wg sync.WaitGroup
	responses := make(chan int, 2)
	for i := 0; i < 2; i++ {
		candidate := in
		candidate.ID = id.New()
		wg.Add(1)
		go func() { defer wg.Done(); responses <- app.Write(a, "POST", "/api/v1/workouts", candidate, 0).Code }()
	}
	wg.Wait()
	close(responses)
	success, conflict := 0, 0
	for status := range responses {
		if status == 201 {
			success++
		}
		if status == 409 {
			conflict++
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatal(success, conflict)
	}
	r := app.Request(a, "GET", "/api/v1/workouts/active", nil, "", "")
	var w Workout
	domaintest.Decode(t, r, &w)
	finish := in.StartedAt.Add(time.Minute)
	w = send(t, app, a, w, "finish_workout", map[string]any{"finishedAt": finish, "skipRemaining": false}, finish, 409)
	w = send(t, app, a, w, "finish_workout", map[string]any{"finishedAt": finish, "skipRemaining": true}, finish, 200)
	if w.Summary.CompletedSets != 0 || w.CurrentRevision.Exercises[0].Sets[0].Status != "skipped" {
		t.Fatal(w)
	}
}

func TestSavedProgramSnapshotAndReplacementProtection(t *testing.T) {
	app, a, in := setup(t)
	(&programs.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	weekday := int(in.StartedAt.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	date := in.LocalDate
	revision := programs.Input{StartDate: date, EndDate: in.StartedAt.AddDate(0, 0, 30).Format("2006-01-02"), EffectiveFrom: date, Timezone: "UTC", Days: []programs.InputDay{{Weekday: weekday, Exercises: in.Exercises}}}
	response := app.Write(a, "POST", "/api/v1/programs", map[string]any{"id": id.New(), "name": "План", "revision": revision}, 0)
	domaintest.Status(t, response, 201)
	var plan programs.Program
	domaintest.Decode(t, response, &plan)
	originalID := plan.CurrentRevision.ID
	in.ProgramRevisionID = &originalID
	in.ScheduledDate = &date
	eid := in.Exercises[0].ExerciseID
	domaintest.Status(t, app.Write(a, "PATCH", "/api/v1/exercises/"+eid, map[string]any{"name": "Переименован"}, 1), 200)
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs/"+plan.ID+"/revisions", map[string]any{"expectedVersion": 1, "revision": revision}, 0), 200)
	response = app.Write(a, "POST", "/api/v1/workouts", in, 0)
	domaintest.Status(t, response, 201)
	var w Workout
	domaintest.Decode(t, response, &w)
	if w.CurrentRevision.Exercises[0].NameSnapshot != "Жим" || *w.ProgramRevisionID != originalID {
		t.Fatal("snapshot overwritten")
	}
	domaintest.Status(t, app.Write(a, "PUT", "/api/v1/programs/"+plan.ID+"/exceptions/"+date, map[string]any{"expectedVersion": 2, "action": "cancel"}, 0), 409)
	at := in.StartedAt.Add(10 * time.Second)
	setID := in.Exercises[0].Targets[0].ID
	w = send(t, app, a, w, "complete_set", map[string]any{"setId": setID, "actualWeightKg": "45.00", "actualReps": 8, "completedAt": at}, at, 200)
	data, _ := json.Marshal(w.CurrentRevision.Exercises)
	var xs []Exercise
	json.Unmarshal(data, &xs)
	badReps := 999
	xs[0].Sets[0].ActualReps = &badReps
	w = send(t, app, a, w, "replace_active_exercises", map[string]any{"exercises": xs}, at, 409)
	w = send(t, app, a, w, "replace_active_exercises", map[string]any{"exercises": w.CurrentRevision.Exercises}, at, 200)
	if w.CurrentRevision.Exercises[0].Sets[0].Status != "completed" {
		t.Fatal("fact lost")
	}
}
