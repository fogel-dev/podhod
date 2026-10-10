package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/testdb"
	"github.com/jackc/pgx/v5/pgxpool"
)

const testPassword = "достаточно длинный пароль"

type testApp struct {
	service *Service
	mux     *http.ServeMux
	pool    *pgxpool.Pool
}

func application(t *testing.T) testApp {
	t.Helper()
	url := testdb.New(t)
	ctx := context.Background()
	if err := database.Migrate(ctx, url); err != nil {
		t.Fatal(err)
	}
	pool, err := database.Open(ctx, url+"&role=podhod_api", 4)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	service, err := New(pool, strings.Repeat("ab", 32), "https://podhod.test", false, "")
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	service.RegisterRoutes(mux)
	return testApp{service, mux, pool}
}
func (a testApp) request(method, path, body string, cookie *http.Cookie, csrf, version string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.RemoteAddr = "127.0.0.1:32100"
	r.Header.Set("Origin", a.service.Origin)
	r.Header.Set("Content-Type", "application/json")
	if cookie != nil {
		r.AddCookie(cookie)
	}
	if csrf != "" {
		r.Header.Set("X-CSRF-Token", csrf)
	}
	if version != "" {
		r.Header.Set("If-Match", version)
	}
	w := httptest.NewRecorder()
	a.mux.ServeHTTP(w, r)
	return w
}
func registration(login string) string {
	body, _ := json.Marshal(accessRequest{Email: "same@example.invalid", Login: login, Password: testPassword, PasswordConfirmation: testPassword, DeviceLabel: "Тест"})
	return string(body)
}
func loginBody(login, password string) string {
	body, _ := json.Marshal(map[string]string{"login": login, "password": password, "deviceLabel": "Другое устройство"})
	return string(body)
}
func mustSession(t *testing.T, w *httptest.ResponseRecorder, status int) (Session, *http.Cookie) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	var value Session
	if err := json.Unmarshal(w.Body.Bytes(), &value); err != nil {
		t.Fatal(err)
	}
	cookies := w.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatal("missing session cookie")
	}
	return value, cookies[0]
}

func TestRegistrationSessionsIsolationAndPasswordChange(t *testing.T) {
	app := application(t)
	first, cookie := mustSession(t, app.request("POST", "/api/v1/auth/register", registration("first"), nil, "", ""), 201)
	if !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != "/" || cookie.Domain != "" || first.User.EmailVerified {
		t.Fatal("unsafe session/email flags")
	}
	if first.User.CreatedAt.IsZero() || first.User.UpdatedAt.IsZero() {
		t.Fatal("missing timestamps")
	}
	second, otherCookie := mustSession(t, app.request("POST", "/api/v1/auth/register", registration("second"), nil, "", ""), 201)
	if first.User.ID == second.User.ID {
		t.Fatal("email merged accounts")
	}
	if w := app.request("POST", "/api/v1/auth/register", registration("first"), nil, "", ""); w.Code != 409 {
		t.Fatalf("duplicate=%d", w.Code)
	}
	if w := app.request("GET", "/api/v1/me", "", cookie, "", ""); w.Code != 200 || strings.Contains(w.Body.String(), "password") {
		t.Fatal("profile failed or leaked credential")
	}
	if w := app.request("DELETE", "/api/v1/me/devices/"+second.DeviceID, "", cookie, first.CSRFToken, `"1"`); w.Code != 404 {
		t.Fatalf("cross owner=%d", w.Code)
	}
	if w := app.request("DELETE", "/api/v1/me/devices/"+second.DeviceID, "", otherCookie, "", `"1"`); w.Code != 403 {
		t.Fatal("CSRF accepted")
	}
	session2, cookie2 := mustSession(t, app.request("POST", "/api/v1/auth/login", loginBody(" FIRST ", testPassword), nil, "", ""), 200)
	if session2.User.ID != first.User.ID {
		t.Fatal("login normalization")
	}
	if w := app.request("PATCH", "/api/v1/me", `{"timezone":"Asia/Novosibirsk"}`, cookie, first.CSRFToken, `"1"`); w.Code != 200 {
		t.Fatalf("patch=%d %s", w.Code, w.Body.String())
	}
	if w := app.request("PATCH", "/api/v1/me", `{"timezone":"UTC"}`, cookie, first.CSRFToken, `"1"`); w.Code != 409 {
		t.Fatal("stale profile overwrite")
	}
	body, _ := json.Marshal(map[string]string{"currentPassword": testPassword, "password": "новый достаточно длинный пароль", "passwordConfirmation": "новый достаточно длинный пароль"})
	changed := app.request("POST", "/api/v1/auth/password/change", string(body), cookie, first.CSRFToken, "")
	if changed.Code != 204 {
		t.Fatalf("change=%d %s", changed.Code, changed.Body.String())
	}
	newCookie := changed.Result().Cookies()[0]
	if newCookie.Value == cookie.Value {
		t.Fatal("password change did not rotate cookie")
	}
	for _, old := range []*http.Cookie{cookie, cookie2} {
		if app.request("GET", "/api/v1/auth/session", "", old, "", "").Code != 401 {
			t.Fatal("old session survived")
		}
	}
	if app.request("GET", "/api/v1/auth/session", "", newCookie, "", "").Code != 200 {
		t.Fatal("current session lost")
	}
	if app.request("POST", "/api/v1/auth/login", loginBody("first", testPassword), nil, "", "").Code != 401 {
		t.Fatal("old password accepted")
	}
	if app.request("GET", "/api/v1/me", "", otherCookie, "", "").Code != 200 {
		t.Fatal("changed another user's sessions")
	}
}

func TestLimitsValidationOriginAndRevocation(t *testing.T) {
	app := application(t)
	bad := httptest.NewRequest("POST", "/api/v1/auth/register", strings.NewReader(registration("attacker")))
	bad.Header.Set("Origin", "https://other.test")
	w := httptest.NewRecorder()
	app.mux.ServeHTTP(w, bad)
	if w.Code != 403 {
		t.Fatal("foreign origin accepted")
	}
	mismatch := strings.Replace(registration("wrong"), `"passwordConfirmation":"`+testPassword+`"`, `"passwordConfirmation":"wrong"`, 1)
	if app.request("POST", "/api/v1/auth/register", mismatch, nil, "", "").Code != 422 {
		t.Fatal("confirmation ignored")
	}
	session, cookie := mustSession(t, app.request("POST", "/api/v1/auth/register", registration("owner"), nil, "", ""), 201)
	unknown := app.request("POST", "/api/v1/auth/login", loginBody("unknown", testPassword), nil, "", "")
	wrong := app.request("POST", "/api/v1/auth/login", loginBody("owner", "это другой длинный пароль"), nil, "", "")
	if unknown.Code != 401 || wrong.Code != 401 || !strings.Contains(unknown.Body.String(), "invalid_credentials") || !strings.Contains(wrong.Body.String(), "invalid_credentials") {
		t.Fatal("credential enumeration")
	}
	for range 10 {
		app.request("POST", "/api/v1/auth/login", loginBody("unknown", testPassword), nil, "", "")
	}
	limited := app.request("POST", "/api/v1/auth/login", loginBody("unknown", testPassword), nil, "", "")
	if limited.Code != 429 || limited.Header().Get("Retry-After") == "" {
		t.Fatal("login limits missing")
	}
	if w := app.request("DELETE", "/api/v1/me/devices/"+session.DeviceID, "", cookie, session.CSRFToken, ""); w.Code != 428 {
		t.Fatal("missing version accepted")
	}
	if w := app.request("DELETE", "/api/v1/me/devices/"+session.DeviceID, "", cookie, session.CSRFToken, `"1"`); w.Code != 204 {
		t.Fatalf("revoke=%d %s", w.Code, w.Body.String())
	}
	if app.request("GET", "/api/v1/auth/session", "", cookie, "", "").Code != 401 {
		t.Fatal("revoked device still authenticated")
	}
}

func TestConcurrentRegistrationIsAtomic(t *testing.T) {
	app := application(t)
	responses := make(chan int, 2)
	for range 2 {
		go func() {
			responses <- app.request("POST", "/api/v1/auth/register", registration("concurrent"), nil, "", "").Code
		}()
	}
	one, two := <-responses, <-responses
	if !((one == 201 && two == 409) || (one == 409 && two == 201)) {
		t.Fatalf("statuses=%d,%d", one, two)
	}
	var users, credentials, sessions int
	err := app.pool.QueryRow(context.Background(), `SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM password_credentials),(SELECT count(*) FROM sessions)`).Scan(&users, &credentials, &sessions)
	if err != nil || users != 1 || credentials != 1 || sessions != 1 {
		t.Fatalf("partial registration %d %d %d err=%v", users, credentials, sessions, err)
	}
}

func TestLogoutAndSessionExpiry(t *testing.T) {
	app := application(t)
	session, cookie := mustSession(t, app.request("POST", "/api/v1/auth/register", registration("logout_test"), nil, "", ""), 201)
	if w := app.request("POST", "/api/v1/auth/logout", "", cookie, session.CSRFToken, ""); w.Code != 204 {
		t.Fatalf("logout=%d", w.Code)
	}
	if app.request("GET", "/api/v1/auth/session", "", cookie, "", "").Code != 401 {
		t.Fatal("logout left session active")
	}
	_, cookie = mustSession(t, app.request("POST", "/api/v1/auth/login", loginBody("logout_test", testPassword), nil, "", ""), 200)
	_, err := app.pool.Exec(context.Background(), `UPDATE sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE token_hash=$1`, tokenHash(cookie.Value))
	if err != nil {
		t.Fatal(err)
	}
	if app.request("GET", "/api/v1/auth/session", "", cookie, "", "").Code != 401 {
		t.Fatal("expired session accepted")
	}
}

func TestPasswordHashBoundsAndLocalConfiguration(t *testing.T) {
	hash := hashPassword(testPassword)
	if !verifyPassword(testPassword, hash) || verifyPassword("wrong", hash) {
		t.Fatal("password hash incorrect")
	}
	if verifyPassword(testPassword, strings.Replace(hash, "m=19456", "m=999999999", 1)) {
		t.Fatal("unbounded hash")
	}
	if _, err := New(nil, strings.Repeat("ab", 32), "http://public.test", true, ""); err == nil {
		t.Fatal("insecure public origin accepted")
	}
	if _, err := New(nil, strings.Repeat("ab", 32), "http://127.0.0.1:5173", true, ""); err != nil {
		t.Fatal(err)
	}
}
