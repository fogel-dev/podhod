// Package domaintest builds real authenticated HTTP applications on isolated PostgreSQL databases.
package domaintest

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/testdb"
)

type App struct {
	Core *httpx.Core
	Auth *auth.Service
	Mux  *http.ServeMux
	URL  string
}
type Client struct {
	Session auth.Session
	Cookie  *http.Cookie
}

func New(t *testing.T) *App {
	t.Helper()
	url := testdb.New(t)
	ctx := context.Background()
	if err := database.Migrate(ctx, url); err != nil {
		t.Fatal(err)
	}
	pool, err := database.Open(ctx, url+"&role=podhod_api", 8)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	key := strings.Repeat("cd", 32)
	access, err := auth.New(pool, key, "https://podhod.test", false, "")
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	access.RegisterRoutes(mux)
	return &App{httpx.New(pool, key), access, mux, url}
}
func (a *App) User(t *testing.T, login string) Client {
	t.Helper()
	body := map[string]any{"email": login + "@example.invalid", "login": login, "password": "проверочный длинный пароль", "passwordConfirmation": "проверочный длинный пароль", "deviceLabel": "Тест"}
	w := a.Request(Client{}, "POST", "/api/v1/auth/register", body, "", "")
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body.String())
	}
	var c Client
	Decode(t, w, &c.Session)
	c.Cookie = w.Result().Cookies()[0]
	return c
}
func (a *App) Request(c Client, method, path string, body any, key, version string) *httptest.ResponseRecorder {
	data, _ := json.Marshal(body)
	r := httptest.NewRequest(method, path, strings.NewReader(string(data)))
	r.Header.Set("Origin", a.Auth.Origin)
	r.Header.Set("Content-Type", "application/json")
	if c.Cookie != nil {
		r.AddCookie(c.Cookie)
		r.Header.Set("X-CSRF-Token", c.Session.CSRFToken)
		r.Header.Set("X-Device-Id", c.Session.DeviceID)
	}
	if key != "" {
		r.Header.Set("Idempotency-Key", key)
	}
	if version != "" {
		r.Header.Set("If-Match", version)
	}
	w := httptest.NewRecorder()
	a.Mux.ServeHTTP(w, r)
	return w
}
func (a *App) Write(c Client, method, path string, body any, version int64) *httptest.ResponseRecorder {
	return a.Request(c, method, path, body, id.New(), httpx.ETag(version))
}
func Decode(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.Unmarshal(w.Body.Bytes(), v); err != nil {
		t.Fatal(err, w.Body.String())
	}
}
func Status(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status %d wanted %d: %s", w.Code, status, w.Body.String())
	}
}
