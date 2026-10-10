package workouts

import (
	"context"
	"encoding/json"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"sync"
	"testing"
	"time"
)

func TestCorrectionClonesHistoryAndConflicts(t *testing.T) {
	app, a, in := setup(t)
	other := app.User(t, "second")
	response := app.Write(a, "POST", "/api/v1/workouts", in, 0)
	domaintest.Status(t, response, 201)
	var w Workout
	domaintest.Decode(t, response, &w)
	at := in.StartedAt.Add(10 * time.Second)
	w = send(t, app, a, w, "complete_set", map[string]any{"setId": in.Exercises[0].Targets[0].ID, "actualWeightKg": "45.00", "actualReps": 10, "completedAt": at}, at, 200)
	finish := at.Add(10 * time.Second)
	w = send(t, app, a, w, "finish_workout", map[string]any{"finishedAt": finish, "skipRemaining": true}, finish, 200)
	oldID := w.CurrentRevision.ID
	encoded, _ := json.Marshal(w.CurrentRevision.Exercises)
	var xs []Exercise
	json.Unmarshal(encoded, &xs)
	weight, reps := "60.00", 12
	xs[0].Sets[0].ActualWeightKg = &weight
	xs[0].Sets[0].ActualReps = &reps
	payload, _ := json.Marshal(map[string]any{"reason": "Исправлена ошибка ввода", "startedAt": w.StartedAt, "finishedAt": w.FinishedAt, "exercises": xs, "restIntervals": w.CurrentRevision.RestIntervals})
	var wg sync.WaitGroup
	statuses := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			cmd := Command{id.New(), a.Session.DeviceID, w.ID, w.Version, time.Now().UTC(), "correct_result", payload}
			statuses <- app.Request(a, "POST", "/api/v1/workouts/"+w.ID+"/commands", cmd, "", "").Code
		}()
	}
	wg.Wait()
	close(statuses)
	success, conflict := 0, 0
	for status := range statuses {
		if status == 200 {
			success++
		}
		if status == 409 {
			conflict++
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatal(success, conflict)
	}
	response = app.Request(a, "GET", "/api/v1/workouts/"+w.ID, nil, "", "")
	domaintest.Decode(t, response, &w)
	if w.CurrentRevision.ID == oldID || w.CurrentRevision.RevisionNo != 2 || w.CurrentRevision.Reason == nil || w.Summary.Volume != "720.00" || w.Version != 4 {
		t.Fatal(w)
	}
	response = app.Request(a, "GET", "/api/v1/workouts/"+w.ID+"/revisions/"+oldID, nil, "", "")
	domaintest.Status(t, response, 200)
	var old Revision
	domaintest.Decode(t, response, &old)
	if *old.Exercises[0].Sets[0].ActualWeightKg != "45.00" || *old.Exercises[0].Sets[0].ActualReps != 10 {
		t.Fatal("old facts rewritten")
	}
	domaintest.Status(t, app.Request(other, "GET", "/api/v1/workouts/"+w.ID+"/revisions/"+oldID, nil, "", ""), 404)
	response = app.Request(a, "GET", "/api/v1/workouts/"+w.ID+"/revisions", nil, "", "")
	var page struct{ Items []Revision }
	domaintest.Decode(t, response, &page)
	if len(page.Items) != 2 {
		t.Fatal(response.Body.String())
	}
	_, err := app.Core.Pool.Exec(context.Background(), `DELETE FROM workout_sets WHERE user_id=$1 AND revision_id=$2`, a.Session.User.ID, oldID)
	if err == nil {
		t.Fatal("old revision deleted by runtime")
	}
	_, err = app.Core.Pool.Exec(context.Background(), `UPDATE workout_revisions SET sealed=false WHERE id=$1`, w.CurrentRevision.ID)
	if err == nil {
		t.Fatal("corrected revision unsealed")
	}
}
