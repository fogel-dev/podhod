package journal

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/fogel-dev/podhod/apps/api/internal/workouts"
	"sync"
	"testing"
	"time"
)

func TestMultipleNotesOwnershipAndVersions(t *testing.T) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "first")
	b := app.User(t, "second")
	date := "2026-10-15"
	first, second := id.New(), id.New()
	path := "/api/v1/days/" + date + "/notes/"
	for _, noteID := range []string{first, second} {
		domaintest.Status(t, app.Write(a, "PUT", path+noteID, map[string]any{"body": "Отдельная заметка"}, 0), 200)
	}
	var day Day
	domaintest.Decode(t, app.Request(a, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
	if len(day.Notes) != 2 || day.Note == nil {
		t.Fatal("notes missing")
	}
	domaintest.Status(t, app.Write(b, "PUT", path+first, map[string]any{"body": "Чужая правка"}, 1), 409)
	domaintest.Status(t, app.Write(b, "DELETE", path+first, nil, 1), 404)
	domaintest.Status(t, app.Write(a, "PUT", path+first, map[string]any{"body": "Правка"}, 1), 200)
	domaintest.Status(t, app.Write(a, "PUT", path+first, map[string]any{"body": "Устаревшая правка"}, 1), 409)
	domaintest.Status(t, app.Write(a, "DELETE", path+first, nil, 2), 204)
	domaintest.Decode(t, app.Request(a, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
	if len(day.Notes) != 1 || day.Notes[0].ID != second {
		t.Fatal("deleted sibling note")
	}
	domaintest.Decode(t, app.Request(b, "GET", "/api/v1/days/"+date, nil, "", ""), &day)
	if len(day.Notes) != 0 || day.Note != nil {
		t.Fatal("foreign notes leaked")
	}
}

func TestNotesCalendarMovesAndDateStability(t *testing.T) {
	app := domaintest.New(t)
	(&Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	(&exercises.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	(&programs.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	(&workouts.Service{Core: app.Core, Auth: app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "first")
	other := app.User(t, "second")
	date := time.Now().UTC().Format("2006-01-02")
	path := "/api/v1/days/" + date + "/note"
	key := id.New()
	w := app.Request(a, "PUT", path, map[string]any{"body": "Заметка без тренировки"}, key, `"0"`)
	domaintest.Status(t, w, 200)
	var n Note
	domaintest.Decode(t, w, &n)
	domaintest.Status(t, app.Request(a, "PUT", path, map[string]any{"body": "Заметка без тренировки"}, key, `"0"`), 200)
	var wg sync.WaitGroup
	statuses := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			statuses <- app.Write(a, "PUT", path, map[string]any{"body": "Изменённая заметка"}, 1).Code
		}()
	}
	wg.Wait()
	close(statuses)
	success, conflict := 0, 0
	for s := range statuses {
		if s == 200 {
			success++
		}
		if s == 409 {
			conflict++
		}
	}
	if success != 1 || conflict != 1 {
		t.Fatal(success, conflict)
	}
	w = app.Request(other, "GET", "/api/v1/days/"+date, nil, "", "")
	var day Day
	domaintest.Decode(t, w, &day)
	if day.Note != nil {
		t.Fatal("foreign note leaked")
	}
	domaintest.Status(t, app.Write(a, "DELETE", path, nil, 2), 204)
	domaintest.Status(t, app.Write(a, "PUT", path, map[string]any{"body": "Новая после удаления"}, 0), 200)
	eid := id.New()
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/exercises", map[string]any{"id": eid, "name": "Жим"}, 0), 201)
	start := time.Now().UTC().AddDate(0, 0, 7)
	for start.Weekday() != time.Monday {
		start = start.AddDate(0, 0, 1)
	}
	source := start.Format("2006-01-02")
	target := start.AddDate(0, 0, 1).Format("2006-01-02")
	in := programs.Input{StartDate: source, EndDate: start.AddDate(0, 0, 14).Format("2006-01-02"), EffectiveFrom: source, Timezone: "UTC", Days: []programs.InputDay{{Weekday: 1, Exercises: []programs.InputExercise{{ID: id.New(), ExerciseID: eid, Position: 1, Targets: []programs.Target{{ID: id.New(), Position: 1, RepsMin: 1, RepsMax: 5}}}}}}}
	pid := id.New()
	domaintest.Status(t, app.Write(a, "POST", "/api/v1/programs", map[string]any{"id": pid, "name": "План", "revision": in}, 0), 201)
	domaintest.Status(t, app.Write(a, "PUT", "/api/v1/programs/"+pid+"/exceptions/"+source, map[string]any{"expectedVersion": 1, "action": "move", "targetDate": target}, 0), 200)
	w = app.Request(a, "GET", "/api/v1/days/"+source, nil, "", "")
	domaintest.Status(t, w, 200)
	domaintest.Decode(t, w, &day)
	if len(day.Plans) != 1 || day.Plans[0].Status != "moved" || day.Plans[0].Date != target {
		t.Fatal(w.Body.String())
	}
	w = app.Request(a, "GET", "/api/v1/days/"+target, nil, "", "")
	domaintest.Status(t, w, 200)
	domaintest.Decode(t, w, &day)
	if len(day.Plans) != 1 || day.Plans[0].Status != "planned" || day.Plans[0].SourceDate != source {
		t.Fatal(w.Body.String())
	}
	month := start.Format("2006-01")
	w = app.Request(a, "GET", "/api/v1/calendar?month="+month, nil, "", "")
	domaintest.Status(t, w, 200)
	var calendar struct{ Days []CalendarDay }
	domaintest.Decode(t, w, &calendar)
	if len(calendar.Days) < 28 || len(calendar.Days) > 31 {
		t.Fatal(w.Body.String())
	}
	w = app.Request(a, "GET", "/api/v1/calendar?month=2026-13", nil, "", "")
	domaintest.Status(t, w, 422)
	domaintest.Status(t, app.Request(a, "PATCH", "/api/v1/me", map[string]any{"timezone": "Asia/Novosibirsk"}, "", `"1"`), 200)
	w = app.Request(a, "GET", "/api/v1/days/"+date, nil, "", "")
	domaintest.Decode(t, w, &day)
	if day.Date != date || day.Note == nil || day.Note.LocalDate != date {
		t.Fatal("timezone moved note")
	}
	var changes int
	if err := app.Core.Pool.QueryRow(context.Background(), `SELECT count(*) FROM change_log WHERE user_id=$1 AND entity_type='day_note'`, a.Session.User.ID).Scan(&changes); err != nil || changes != 4 {
		t.Fatal(changes, err)
	}
}
