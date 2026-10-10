package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	Pool       *pgxpool.Pool
	key        []byte
	Origin     string
	cookieName string
	secure     bool
	proxyNets  []*net.IPNet
	hashSlots  chan struct{}
	dummyHash  string
}

func New(pool *pgxpool.Pool, key, origin string, insecureLocal bool, trustedProxies string) (*Service, error) {
	decoded, err := hex.DecodeString(key)
	if err != nil || len(decoded) != 32 {
		return nil, errors.New("AUTH_HMAC_KEY must be 32 bytes encoded as hex")
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" || parsed.Path != "" {
		return nil, errors.New("PUBLIC_ORIGIN must be an origin without a path")
	}
	local := parsed.Hostname() == "localhost" || net.ParseIP(parsed.Hostname()) != nil && net.ParseIP(parsed.Hostname()).IsLoopback()
	if parsed.Scheme != "https" && !(insecureLocal && local && parsed.Scheme == "http") {
		return nil, errors.New("PUBLIC_ORIGIN requires HTTPS; insecure auth is only allowed on loopback")
	}
	if insecureLocal && (!local || parsed.Scheme != "http") {
		return nil, errors.New("AUTH_INSECURE_LOCAL is only valid for HTTP loopback")
	}
	s := &Service{Pool: pool, key: decoded, Origin: origin, cookieName: "__Host-podhod_session", secure: !insecureLocal, hashSlots: make(chan struct{}, 2), dummyHash: hashPassword("unavailable account credential")}
	if insecureLocal {
		s.cookieName = "podhod_session_dev"
	}
	for _, value := range strings.Split(trustedProxies, ",") {
		if strings.TrimSpace(value) == "" {
			continue
		}
		_, network, err := net.ParseCIDR(strings.TrimSpace(value))
		if err != nil {
			return nil, errors.New("invalid TRUSTED_PROXY_CIDRS")
		}
		s.proxyNets = append(s.proxyNets, network)
	}
	return s, nil
}

type User struct {
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	ID            string    `json:"id"`
	Login         string    `json:"login"`
	Email         *string   `json:"email"`
	EmailVerified bool      `json:"emailVerified"`
	Timezone      string    `json:"timezone"`
	Locale        string    `json:"locale"`
	Version       int64     `json:"version"`
}
type Session struct {
	User      User      `json:"user"`
	DeviceID  string    `json:"deviceId"`
	ExpiresAt time.Time `json:"expiresAt"`
	CSRFToken string    `json:"csrfToken"`
}
type Actor struct {
	Session
	SessionID string
	token     string
}

const userColumns = "u.id::text,u.login_normalized,u.email_normalized,(u.email_verified_at IS NOT NULL),u.timezone,u.locale,u.version,u.created_at,u.updated_at"

func (s *Service) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/auth/register", s.register)
	mux.HandleFunc("POST /api/v1/auth/login", s.login)
	mux.HandleFunc("GET /api/v1/auth/session", s.Require(func(w http.ResponseWriter, r *http.Request, a Actor) { respond(w, 200, a.Session) }))
	mux.HandleFunc("POST /api/v1/auth/logout", s.Require(s.logout))
	mux.HandleFunc("POST /api/v1/auth/password/change", s.Require(s.changePassword))
	mux.HandleFunc("GET /api/v1/me", s.Require(func(w http.ResponseWriter, r *http.Request, a Actor) {
		w.Header().Set("ETag", etag(a.User.Version))
		respond(w, 200, a.User)
	}))
	mux.HandleFunc("PATCH /api/v1/me", s.Require(s.updateProfile))
	mux.HandleFunc("GET /api/v1/me/devices", s.Require(s.devices))
	mux.HandleFunc("DELETE /api/v1/me/devices/{id}", s.Require(s.revokeDevice))
}

func respond(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if value != nil {
		_ = json.NewEncoder(w).Encode(value)
	}
}
func problem(w http.ResponseWriter, status int, code, message string) {
	respond(w, status, map[string]any{"error": map[string]any{"code": code, "message": message, "requestId": id.New()}})
}
func decode(w http.ResponseWriter, r *http.Request, value any) bool {
	content, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || content != "application/json" {
		problem(w, 415, "unsupported_media_type", "Используйте JSON")
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	err = decoder.Decode(value)
	if err == nil {
		var trailing any
		if decoder.Decode(&trailing) != io.EOF {
			err = errors.New("trailing JSON")
		}
	}
	if err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			problem(w, 413, "body_too_large", "Запрос слишком большой")
		} else {
			problem(w, 400, "invalid_json", "Некорректный запрос")
		}
		return false
	}
	return true
}
func (s *Service) originOK(w http.ResponseWriter, r *http.Request) bool {
	if r.Header.Get("Origin") != s.Origin {
		problem(w, 403, "invalid_origin", "Запрос запрещён")
		return false
	}
	return true
}
func (s *Service) digest(value string) []byte {
	m := hmac.New(sha256.New, s.key)
	m.Write([]byte(value))
	return m.Sum(nil)
}
func tokenHash(value string) []byte { hash := sha256.Sum256([]byte(value)); return hash[:] }
func randomToken() string {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		panic("secure randomness unavailable")
	}
	return base64.RawURLEncoding.EncodeToString(value)
}
func (s *Service) csrf(token string) string {
	return base64.RawURLEncoding.EncodeToString(s.digest("csrf:" + token))
}
func (s *Service) setCookie(w http.ResponseWriter, token string, expires time.Time) {
	maxAge := int(time.Until(expires).Seconds())
	if token == "" {
		maxAge = -1
	}
	http.SetCookie(w, &http.Cookie{Name: s.cookieName, Value: token, Path: "/", Secure: s.secure, HttpOnly: true, SameSite: http.SameSiteLaxMode, Expires: expires, MaxAge: maxAge})
}
func etag(version int64) string { return `"` + strconv.FormatInt(version, 10) + `"` }
func expectedVersion(w http.ResponseWriter, r *http.Request) (int64, bool) {
	value := r.Header.Get("If-Match")
	if value == "" {
		problem(w, 428, "precondition_required", "Нужна версия записи")
		return 0, false
	}
	version, err := strconv.ParseInt(strings.Trim(value, `"`), 10, 64)
	if err != nil || version < 1 || value != etag(version) {
		problem(w, 400, "invalid_version", "Некорректная версия")
		return 0, false
	}
	return version, true
}

var loginPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{2,31}$`)
var uuidPattern = regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`)

func normalizeLogin(value string) string { return strings.ToLower(strings.TrimSpace(value)) }

func (s *Service) ip(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	address := net.ParseIP(host)
	trusted := false
	for _, network := range s.proxyNets {
		if network.Contains(address) {
			trusted = true
			break
		}
	}
	if trusted {
		// Walk from the trusted proxy backwards; never trust the first arbitrary XFF entry.
		chain := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
		for i := len(chain) - 1; i >= 0; i-- {
			candidate := net.ParseIP(strings.TrimSpace(chain[i]))
			if candidate == nil {
				break
			}
			host = candidate.String()
			known := false
			for _, network := range s.proxyNets {
				if network.Contains(candidate) {
					known = true
					break
				}
			}
			if !known {
				break
			}
		}
	}
	return host
}
func (s *Service) limit(w http.ResponseWriter, r *http.Request, scope string, max int, window time.Duration) bool {
	start := time.Now().UTC().Truncate(window)
	expires := start.Add(window)
	var count int
	err := s.Pool.QueryRow(r.Context(), `INSERT INTO auth_rate_limits(key,window_start,attempts,expires_at) VALUES($1,$2,1,$3)
 ON CONFLICT(key,window_start) DO UPDATE SET attempts=LEAST(auth_rate_limits.attempts+1,$4) RETURNING attempts`, s.digest(scope), start, expires, max+1).Scan(&count)
	if err != nil {
		problem(w, 503, "not_ready", "Сервис временно недоступен")
		return false
	}
	if count > max {
		w.Header().Set("Retry-After", strconv.Itoa(int(time.Until(expires).Seconds())+1))
		problem(w, 429, "rate_limited", "Слишком много попыток. Попробуйте позже")
		return false
	}
	if count == 1 {
		_, _ = s.Pool.Exec(r.Context(), `DELETE FROM auth_rate_limits WHERE (key,window_start) IN
		(SELECT key,window_start FROM auth_rate_limits WHERE expires_at<now() ORDER BY expires_at LIMIT 100)`)
	}
	return true
}
func (s *Service) slot(w http.ResponseWriter, r *http.Request) bool {
	select {
	case s.hashSlots <- struct{}{}:
		return true
	case <-r.Context().Done():
		return false
	default:
		w.Header().Set("Retry-After", "2")
		problem(w, 429, "server_busy", "Попробуйте через несколько секунд")
		return false
	}
}

func (s *Service) Authenticate(r *http.Request) (Actor, error) {
	var actor Actor
	cookie, err := r.Cookie(s.cookieName)
	if err != nil || len(cookie.Value) != 43 {
		return actor, errors.New("unauthorized")
	}
	actor.token = cookie.Value
	err = s.Pool.QueryRow(r.Context(), `SELECT `+userColumns+`,s.id::text,s.device_id::text,s.expires_at FROM sessions s
 JOIN users u ON u.id=s.user_id JOIN devices d ON d.id=s.device_id AND d.user_id=s.user_id
 WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND d.revoked_at IS NULL AND u.status='active'`, tokenHash(cookie.Value)).Scan(&actor.User.ID, &actor.User.Login, &actor.User.Email, &actor.User.EmailVerified, &actor.User.Timezone, &actor.User.Locale, &actor.User.Version, &actor.User.CreatedAt, &actor.User.UpdatedAt, &actor.SessionID, &actor.DeviceID, &actor.ExpiresAt)
	if err != nil {
		return Actor{}, err
	}
	actor.CSRFToken = s.csrf(cookie.Value)
	_, err = s.Pool.Exec(r.Context(), `UPDATE devices SET last_seen_at=now() WHERE id=$1 AND user_id=$2 AND last_seen_at<now()-interval '5 minutes'`, actor.DeviceID, actor.User.ID)
	if err != nil {
		return Actor{}, err
	}
	return actor, nil
}
func (s *Service) Require(next func(http.ResponseWriter, *http.Request, Actor)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		actor, err := s.Authenticate(r)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) || err.Error() == "unauthorized" {
				problem(w, 401, "unauthorized", "Войдите в аккаунт")
			} else {
				problem(w, 503, "not_ready", "Сервис временно недоступен")
			}
			return
		}
		if r.Method != "GET" && r.Method != "HEAD" {
			if !s.originOK(w, r) {
				return
			}
			if !hmac.Equal([]byte(r.Header.Get("X-CSRF-Token")), []byte(actor.CSRFToken)) {
				problem(w, 403, "invalid_csrf", "Запрос запрещён")
				return
			}
		}
		next(w, r, actor)
	}
}

func (s *Service) createSession(ctx context.Context, tx pgx.Tx, user User, label string) (Session, string, error) {
	token := randomToken()
	result := Session{User: user, DeviceID: id.New(), ExpiresAt: time.Now().UTC().Add(30 * 24 * time.Hour), CSRFToken: s.csrf(token)}
	// Bound device accumulation; old devices remain visible as revoked history.
	_, err := tx.Exec(ctx, `UPDATE devices SET revoked_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND revoked_at IS NULL AND id IN
 (SELECT id FROM devices WHERE user_id=$1 AND revoked_at IS NULL ORDER BY last_seen_at DESC,id OFFSET 19)`, user.ID)
	if err == nil {
		_, err = tx.Exec(ctx, `INSERT INTO devices(id,user_id,label) VALUES($1,$2,$3)`, result.DeviceID, user.ID, label)
	}
	if err == nil {
		_, err = tx.Exec(ctx, `INSERT INTO sessions(id,user_id,device_id,token_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)`, id.New(), user.ID, result.DeviceID, tokenHash(token), tokenHash(result.CSRFToken), result.ExpiresAt)
	}
	return result, token, err
}
func event(ctx context.Context, tx pgx.Tx, userID, action string) error {
	_, err := tx.Exec(ctx, `INSERT INTO auth_events(id,user_id,action) VALUES($1,$2,$3)`, id.New(), userID, action)
	return err
}
