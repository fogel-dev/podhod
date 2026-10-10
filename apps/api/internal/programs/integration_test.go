package programs

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"testing"
	"time"
)

func TestProgramRevisionsCopyMovesAndOwnership(t *testing.T) {
	app := domaintest.New(t)
	(&Service{app.Core, app.Auth}).RegisterRoutes(app.Mux)
	(&exercises.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "first")
	b := app.User(t, "second")
	eid := id.New()
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/exercises", map[string]any{"id": eid, "name": "Жим"}, 0), 201)
	today, _ := httpx.Date(Today("UTC"))
	start := today.AddDate(0, 0, 7)
	for start.Weekday() != time.Monday {
		start = start.AddDate(0, 0, 1)
	}
	date := start.Format("2006-01-02")
	end := start.AddDate(0, 0, 28).Format("2006-01-02")
	weight := "42.50"
	in := Input{date, end, date, "UTC", []InputDay{{1, []InputExercise{{id.New(), eid, 1, "", []Target{{id.New(), 1, &weight, 8, 10}}}}}}}
	domaintest.Status(t, app.Write(b, "POST", "/api/v1/programs", map[string]any{"id": id.New(), "name": "Общее упражнение", "revision": in}, 0), 201)
	pid := id.New()
	body := map[string]any{"id": pid, "name": "Сила", "revision": in}
	key := id.New()
	w := app.Request(a, "POST", "/api/v1/programs", body, key, "")
	domaintest.Status(t, w, 201)
	var p Program
	domaintest.Decode(t, w, &p)
	original := p.CurrentRevision.ID
	domaintest.Status(t, app.Request(a, "POST", "/api/v1/programs", body, key, ""), 201)
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs", map[string]any{"id": id.New(), "name": "Пересечение", "revision": in}, 0), 409)
	domaintest.Status(t, app.Request(b, "GET", "/api/v1/programs/"+pid, nil, "", ""), 404)
	copy := map[string]any{"expectedVersion": 1, "effectiveFrom": date, "sourceWeekday": 1, "targetWeekdays": []int{3}, "replaceExisting": false}
	w = app.Write(a, "POST", "/api/v1/programs/"+pid+"/copy-day", copy, 0)
	domaintest.Status(t, w, 200)
	domaintest.Decode(t, w, &p)
	if len(p.CurrentRevision.Days) != 2 || p.Version != 2 || p.CurrentRevision.Days[0].Exercises[0].ID == p.CurrentRevision.Days[1].Exercises[0].ID {
		t.Fatal(w.Body.String())
	}
	copy["expectedVersion"] = 2
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs/"+pid+"/copy-day", copy, 0), 409)
	w = app.Request(a, "GET", "/api/v1/programs/"+pid+"/revisions/"+original, nil, "", "")
	domaintest.Status(t, w, 200)
	var old Revision
	domaintest.Decode(t, w, &old)
	if len(old.Days) != 1 {
		t.Fatal("old plan changed")
	}
	ctx := context.Background()
	_, err := app.Core.Pool.Exec(ctx, `UPDATE program_revisions SET sealed=false WHERE id=$1`, original)
	if err == nil {
		t.Fatal("published revision unsealed")
	}
	_, err = app.Core.Pool.Exec(ctx, `INSERT INTO program_days(id,user_id,revision_id,weekday) VALUES($1,$2,$3,7)`, id.New(), a.Session.User.ID, original)
	if err == nil {
		t.Fatal("published day appended")
	}
	moved := start.AddDate(0, 0, 1).Format("2006-01-02")
	w = app.Write(a, "PUT", "/api/v1/programs/"+pid+"/exceptions/"+date, map[string]any{"expectedVersion": 2, "action": "move", "targetDate": moved}, 0)
	domaintest.Status(t, w, 200)
	plans, err := At(ctx, app.Core.Pool, a.Session.User.ID, date)
	if err != nil || len(plans) != 0 {
		t.Fatal(plans, err)
	}
	plans, err = At(ctx, app.Core.Pool, a.Session.User.ID, moved)
	if err != nil || len(plans) != 1 || plans[0].SourceDate != date {
		t.Fatal(plans, err)
	}
	w = app.Write(a, "PUT", "/api/v1/programs/"+pid+"/exceptions/"+date, map[string]any{"expectedVersion": 3, "action": "move", "targetDate": start.AddDate(0, 0, 2).Format("2006-01-02")}, 0)
	domaintest.Status(t, w, 409)
	domaintest.Status(t, app.Write(a, "DELETE", "/api/v1/programs/"+pid+"/exceptions/"+date, nil, 3), 204)
	invalid := in
	invalid.EffectiveFrom = today.AddDate(0, 0, -1).Format("2006-01-02")
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs/"+pid+"/revisions", map[string]any{"expectedVersion": 4, "revision": invalid}, 0), 422)
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs/"+pid+"/archive", map[string]any{"expectedVersion": 4, "effectiveFrom": start.AddDate(0, 0, 7).Format("2006-01-02")}, 0), 200)
	plans, err = At(ctx, app.Core.Pool, a.Session.User.ID, date)
	if err != nil || len(plans) != 1 {
		t.Fatal("archive erased past schedule", err)
	}
	plans, err = At(ctx, app.Core.Pool, a.Session.User.ID, start.AddDate(0, 0, 7).Format("2006-01-02"))
	if err != nil || len(plans) != 0 {
		t.Fatal("archive still planned", err)
	}
}
func TestPlanValidationTimezoneAndTargets(t *testing.T) {
	today := Today("Pacific/Kiritimati")
	in := Input{today, today, today, "Pacific/Kiritimati", []InputDay{{1, []InputExercise{{id.New(), id.New(), 1, "", []Target{{id.New(), 1, nil, 1, 1000}}}}}}}
	if err := validate(in); err != nil {
		t.Fatal(err)
	}
	in.Days[0].Exercises[0].Targets[0].RepsMin = 1001
	if validate(in) == nil {
		t.Fatal("invalid reps accepted")
	}
	in.Days[0].Exercises[0].Targets[0].RepsMin = 1
	in.Timezone = "Not/AZone"
	if validate(in) == nil {
		t.Fatal("invalid timezone accepted")
	}
}
