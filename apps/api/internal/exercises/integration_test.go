package exercises

import (
	"context"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"sync"
	"testing"
)

func TestLibraryOwnershipReceiptsVersionsAndPaging(t *testing.T) {
	app := domaintest.New(t)
	(&Service{app.Core, app.Auth}).RegisterRoutes(app.Mux)
	a := app.User(t, "first")
	b := app.User(t, "second")
	eid, key := id.New(), id.New()
	body := map[string]any{"id": eid, "name": "Тестовый жим", "note": "Личный вариант"}
	w := app.Request(a, "POST", "/api/v1/exercises", body, key, "")
	domaintest.Status(t, w, 201)
	var e Exercise
	domaintest.Decode(t, w, &e)
	if e.TechniqueGuide != nil || e.Version != 1 {
		t.Fatal(e)
	}
	repeat := app.Request(a, "POST", "/api/v1/exercises", body, key, "")
	domaintest.Status(t, repeat, 201)
	var replay Exercise
	domaintest.Decode(t, repeat, &replay)
	if replay.ID != e.ID || replay.Version != e.Version || !replay.CreatedAt.Equal(e.CreatedAt) {
		t.Fatal("receipt differs")
	}
	body["name"] = "Другой"
	domaintest.Status(t, app.Request(a, "POST", "/api/v1/exercises", body, key, ""), 409)
	shared := app.Request(b, "GET", "/api/v1/exercises/"+eid, nil, "", "")
	domaintest.Status(t, shared, 200)
	var other Exercise
	domaintest.Decode(t, shared, &other)
	if other.Note != "" || other.CanEdit || !e.CanEdit {
		t.Fatal("shared exercise leaked private note or edit permissions")
	}
	var sharedPage struct{ Items []Exercise }
	domaintest.Decode(t, app.Request(b, "GET", "/api/v1/exercises?q=тестовый", nil, "", ""), &sharedPage)
	if len(sharedPage.Items) != 1 || sharedPage.Items[0].Note != "" || sharedPage.Items[0].CanEdit {
		t.Fatal("shared library not visible or private note leaked")
	}
	domaintest.Status(t, app.Write(b, "PATCH", "/api/v1/exercises/"+eid, map[string]any{"archived": true}, 1), 404)
	var wg sync.WaitGroup
	statuses := make(chan int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			statuses <- app.Write(a, "PATCH", "/api/v1/exercises/"+eid, map[string]any{"note": "Правка"}, 1).Code
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
	domaintest.Status(t, app.Write(a, "PATCH", "/api/v1/exercises/"+eid, map[string]any{"archived": true}, 2), 200)
	w = app.Request(a, "GET", "/api/v1/exercises?q=тестовый", nil, "", "")
	var page struct {
		Items      []Exercise
		NextCursor *string
	}
	domaintest.Decode(t, w, &page)
	if len(page.Items) != 0 {
		t.Fatal("archive visible")
	}
	w = app.Request(a, "GET", "/api/v1/exercises?includeArchived=true&q=тестовый", nil, "", "")
	domaintest.Decode(t, w, &page)
	if len(page.Items) != 1 {
		t.Fatal(w.Body.String())
	}
	for i := 0; i < 3; i++ {
		domaintest.Status(t, app.Write(a, "POST", "/api/v1/exercises", map[string]any{"id": id.New(), "name": "Тестовый присед"}, 0), 201)
	}
	w = app.Request(a, "GET", "/api/v1/exercises?limit=2&q=тестовый", nil, "", "")
	domaintest.Decode(t, w, &page)
	if len(page.Items) != 2 || page.NextCursor == nil {
		t.Fatal(w.Body.String())
	}
	domaintest.Status(t, app.Request(b, "GET", "/api/v1/exercises?limit=2&q=тестовый&cursor="+*page.NextCursor, nil, "", ""), 400)
	w = app.Request(a, "GET", "/api/v1/exercises?limit=2&q=тестовый&cursor="+*page.NextCursor, nil, "", "")
	domaintest.Decode(t, w, &page)
	if len(page.Items) != 1 {
		t.Fatal(w.Body.String())
	}
	_, err := app.Core.Pool.Exec(context.Background(), `INSERT INTO technique_guides(exercise_id,body,source_title,source_url,reviewed_at,source_accessed_at) VALUES($1,'x','x','https://example.invalid',now(),now())`, eid)
	if err == nil {
		t.Fatal("runtime can publish verified technique")
	}
	var receipts, changes int
	err = app.Core.Pool.QueryRow(context.Background(), `SELECT (SELECT count(*) FROM command_receipts WHERE user_id=$1),(SELECT count(*) FROM change_log WHERE user_id=$1)`, a.Session.User.ID).Scan(&receipts, &changes)
	if err != nil || receipts != 6 || changes != 6 {
		t.Fatal(receipts, changes, err)
	}
}

func TestCuratedCatalogSharedNotesAndReadOnlyGuides(t *testing.T) {
	app := domaintest.New(t)
	(&Service{app.Core, app.Auth}).RegisterRoutes(app.Mux)
	for _, name := range []string{"readerone", "readertwo"} {
		actor := app.User(t, name)
		response := app.Request(actor, "GET", "/api/v1/exercises?limit=100", nil, "", "")
		domaintest.Status(t, response, 200)
		var page struct{ Items []Exercise }
		domaintest.Decode(t, response, &page)
		if len(page.Items) != 22 {
			t.Fatalf("catalog has %d exercises, want 22", len(page.Items))
		}
		for _, e := range page.Items {
			if e.CanEdit || e.Note == "" || e.TechniqueGuide == nil || e.TechniqueGuide.Body == "" || e.TechniqueGuide.SourceTitle == "" || e.TechniqueGuide.SourceURL == "" || e.TechniqueGuide.SourceAccessedAt.After(e.TechniqueGuide.ReviewedAt) {
				t.Fatalf("incomplete or editable catalog exercise: %+v", e)
			}
			loaded, err := Load(context.Background(), app.Core.Pool, actor.Session.User.ID, e.ID)
			if err != nil || loaded.Note != e.Note || loaded.TechniqueGuide == nil {
				t.Fatalf("catalog detail differs: %+v, %v", loaded, err)
			}
		}
		domaintest.Status(t, app.Write(actor, "PATCH", "/api/v1/exercises/"+page.Items[0].ID, map[string]any{"note": "Правка"}, 1), 404)
	}
}
