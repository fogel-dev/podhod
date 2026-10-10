package auth

import (
	"context"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"
	_ "time/tzdata"
	"unicode/utf8"

	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type accessRequest struct {
	Email                string `json:"email"`
	Login                string `json:"login"`
	Password             string `json:"password"`
	PasswordConfirmation string `json:"passwordConfirmation"`
	DeviceLabel          string `json:"deviceLabel"`
}

func validLabel(label string) bool {
	return utf8.ValidString(label) && utf8.RuneCountInString(label) > 0 && utf8.RuneCountInString(label) <= 120
}
func databaseFailure(w http.ResponseWriter) {
	problem(w, 503, "not_ready", "Сервис временно недоступен")
}

func (s *Service) register(w http.ResponseWriter, r *http.Request) {
	if !s.originOK(w, r) || !s.limit(w, r, "register-ip:"+s.ip(r), 5, time.Hour) {
		return
	}
	var input accessRequest
	if !decode(w, r, &input) {
		return
	}
	input.Login = normalizeLogin(input.Login)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.DeviceLabel = strings.TrimSpace(input.DeviceLabel)
	address, err := mail.ParseAddress(input.Email)
	if !loginPattern.MatchString(input.Login) {
		problem(w, 422, "invalid_login", "Логин: 3–32 символа, латинская буква в начале, затем буквы, цифры или _")
		return
	}
	if err != nil || address.Address != input.Email || len(input.Email) > 254 || len(input.Email) < 3 {
		problem(w, 422, "invalid_email", "Укажите корректную почту")
		return
	}
	if !validPassword(input.Password) {
		problem(w, 422, "invalid_password", "Пароль должен содержать от 8 до 128 символов")
		return
	}
	if input.Password != input.PasswordConfirmation {
		problem(w, 422, "password_mismatch", "Пароли не совпадают")
		return
	}
	if !validLabel(input.DeviceLabel) {
		problem(w, 422, "invalid_device_label", "Укажите название устройства до 120 символов")
		return
	}
	if !s.slot(w, r) {
		return
	}
	defer func() { <-s.hashSlots }()
	hash := hashPassword(input.Password)
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	user := User{ID: id.New(), Login: input.Login, Email: &input.Email, Timezone: "UTC", Locale: "ru", Version: 1}
	err = tx.QueryRow(r.Context(), `INSERT INTO users(id,login_normalized,email_normalized) VALUES($1,$2,$3) RETURNING created_at,updated_at`, user.ID, user.Login, user.Email).Scan(&user.CreatedAt, &user.UpdatedAt)
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) && pgError.Code == "23505" {
		problem(w, 409, "login_taken", "Этот логин уже занят")
		return
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `INSERT INTO password_credentials(user_id,password_hash) VALUES($1,$2)`, user.ID, hash)
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `INSERT INTO sync_heads(user_id) VALUES($1)`, user.ID)
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	session, token, err := s.createSession(r.Context(), tx, user, input.DeviceLabel)
	if err == nil {
		err = event(r.Context(), tx, user.ID, "registered")
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	s.setCookie(w, token, session.ExpiresAt)
	respond(w, 201, session)
}

func (s *Service) login(w http.ResponseWriter, r *http.Request) {
	if !s.originOK(w, r) || !s.limit(w, r, "login-ip:"+s.ip(r), 60, 15*time.Minute) {
		return
	}
	var input struct {
		Login       string `json:"login"`
		Password    string `json:"password"`
		DeviceLabel string `json:"deviceLabel"`
	}
	if !decode(w, r, &input) {
		return
	}
	input.Login = normalizeLogin(input.Login)
	input.DeviceLabel = strings.TrimSpace(input.DeviceLabel)
	if !loginPattern.MatchString(input.Login) || !validPassword(input.Password) || !validLabel(input.DeviceLabel) {
		problem(w, 422, "invalid_fields", "Проверьте логин, пароль и название устройства")
		return
	}
	if !s.limit(w, r, "login-name:"+input.Login, 10, 15*time.Minute) || !s.slot(w, r) {
		return
	}
	defer func() { <-s.hashSlots }()
	var user User
	var stored string
	err := s.Pool.QueryRow(r.Context(), `SELECT `+userColumns+`,p.password_hash FROM users u JOIN password_credentials p ON p.user_id=u.id WHERE u.login_normalized=$1 AND u.status='active'`, input.Login).Scan(&user.ID, &user.Login, &user.Email, &user.EmailVerified, &user.Timezone, &user.Locale, &user.Version, &user.CreatedAt, &user.UpdatedAt, &stored)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		databaseFailure(w)
		return
	}
	checked := stored
	if stored == "" {
		checked = s.dummyHash
	}
	valid := verifyPassword(input.Password, checked)
	if err != nil || !valid {
		problem(w, 401, "invalid_credentials", "Неверный логин или пароль")
		return
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	// Serialize against password changes and account deletion; recheck the credential verified above.
	var latest string
	err = tx.QueryRow(r.Context(), `SELECT p.password_hash FROM users u JOIN password_credentials p ON p.user_id=u.id WHERE u.id=$1 AND u.status='active' FOR UPDATE OF u`, user.ID).Scan(&latest)
	if err == nil && latest != stored {
		problem(w, 401, "invalid_credentials", "Неверный логин или пароль")
		return
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	// A repeated login from this browser replaces its old session, without affecting other devices.
	if cookie, cookieErr := r.Cookie(s.cookieName); cookieErr == nil {
		_, err = tx.Exec(r.Context(), `UPDATE devices SET revoked_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND id IN (SELECT device_id FROM sessions WHERE user_id=$1 AND token_hash=$2) AND revoked_at IS NULL`, user.ID, tokenHash(cookie.Value))
		if err == nil {
			_, err = tx.Exec(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND token_hash=$2 AND revoked_at IS NULL`, user.ID, tokenHash(cookie.Value))
		}
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	session, token, err := s.createSession(r.Context(), tx, user, input.DeviceLabel)
	if err == nil {
		err = event(r.Context(), tx, user.ID, "login")
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	s.setCookie(w, token, session.ExpiresAt)
	respond(w, 200, session)
}

func lockActor(ctx context.Context, tx pgx.Tx, a Actor) error {
	var value int
	err := tx.QueryRow(ctx, `SELECT 1 FROM users WHERE id=$1 AND status='active' FOR UPDATE`, a.User.ID).Scan(&value)
	if err != nil {
		return err
	}
	return tx.QueryRow(ctx, `SELECT 1 FROM sessions s JOIN devices d ON d.id=s.device_id AND d.user_id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND d.revoked_at IS NULL`, a.SessionID, a.User.ID).Scan(&value)
}

func (s *Service) logout(w http.ResponseWriter, r *http.Request, a Actor) {
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	if err = lockActor(r.Context(), tx, a); err != nil {
		problem(w, 401, "unauthorized", "Войдите в аккаунт")
		return
	}
	_, err = tx.Exec(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE device_id=$1 AND user_id=$2 AND revoked_at IS NULL`, a.DeviceID, a.User.ID)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE devices SET revoked_at=now(),version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL`, a.DeviceID, a.User.ID)
	}
	if err == nil {
		err = event(r.Context(), tx, a.User.ID, "logout")
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	s.setCookie(w, "", time.Unix(1, 0))
	respond(w, 204, nil)
}

func (s *Service) changePassword(w http.ResponseWriter, r *http.Request, a Actor) {
	var input struct {
		CurrentPassword      string `json:"currentPassword"`
		Password             string `json:"password"`
		PasswordConfirmation string `json:"passwordConfirmation"`
	}
	if !decode(w, r, &input) {
		return
	}
	if !validPassword(input.CurrentPassword) || !validPassword(input.Password) {
		problem(w, 422, "invalid_password", "Пароль должен содержать от 8 до 128 символов")
		return
	}
	if input.Password != input.PasswordConfirmation {
		problem(w, 422, "password_mismatch", "Пароли не совпадают")
		return
	}
	if !s.limit(w, r, "password-change:"+a.User.ID, 10, 15*time.Minute) || !s.slot(w, r) {
		return
	}
	defer func() { <-s.hashSlots }()
	var stored string
	if err := s.Pool.QueryRow(r.Context(), `SELECT password_hash FROM password_credentials WHERE user_id=$1`, a.User.ID).Scan(&stored); err != nil {
		databaseFailure(w)
		return
	}
	if !verifyPassword(input.CurrentPassword, stored) {
		problem(w, 401, "invalid_credentials", "Неверный текущий пароль")
		return
	}
	hash := hashPassword(input.Password)
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	if err = lockActor(r.Context(), tx, a); err != nil {
		problem(w, 401, "unauthorized", "Войдите в аккаунт")
		return
	}
	result, err := tx.Exec(r.Context(), `UPDATE password_credentials SET password_hash=$1,changed_at=now() WHERE user_id=$2 AND password_hash=$3`, hash, a.User.ID, stored)
	if err == nil && result.RowsAffected() != 1 {
		problem(w, 409, "credential_changed", "Пароль уже изменён. Повторите вход")
		return
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL`, a.User.ID, a.SessionID)
	}
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE devices SET revoked_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL`, a.User.ID, a.DeviceID)
	}
	// Rotate even the surviving session token after changing the credential.
	token := randomToken()
	expires := time.Now().UTC().Add(30 * 24 * time.Hour)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE sessions SET token_hash=$1,csrf_hash=$2,last_authenticated_at=now(),expires_at=$3 WHERE id=$4`, tokenHash(token), tokenHash(s.csrf(token)), expires, a.SessionID)
	}
	if err == nil {
		err = event(r.Context(), tx, a.User.ID, "password_changed")
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	s.setCookie(w, token, expires)
	respond(w, 204, nil)
}

type Device struct {
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
	ID         string     `json:"id"`
	Label      string     `json:"label"`
	LastSeenAt time.Time  `json:"lastSeenAt"`
	RevokedAt  *time.Time `json:"revokedAt"`
	Version    int64      `json:"version"`
}

func (s *Service) devices(w http.ResponseWriter, r *http.Request, a Actor) {
	rows, err := s.Pool.Query(r.Context(), `SELECT id::text,label,last_seen_at,revoked_at,version,created_at,updated_at FROM devices WHERE user_id=$1 AND revoked_at IS NULL ORDER BY last_seen_at DESC,id LIMIT 20`, a.User.ID)
	if err != nil {
		databaseFailure(w)
		return
	}
	defer rows.Close()
	devices := make([]Device, 0)
	for rows.Next() {
		var device Device
		if err = rows.Scan(&device.ID, &device.Label, &device.LastSeenAt, &device.RevokedAt, &device.Version, &device.CreatedAt, &device.UpdatedAt); err != nil {
			databaseFailure(w)
			return
		}
		devices = append(devices, device)
	}
	if rows.Err() != nil {
		databaseFailure(w)
		return
	}
	respond(w, 200, map[string]any{"items": devices, "nextCursor": nil})
}
func (s *Service) revokeDevice(w http.ResponseWriter, r *http.Request, a Actor) {
	version, ok := expectedVersion(w, r)
	if !ok {
		return
	}
	deviceID := r.PathValue("id")
	if !uuidPattern.MatchString(deviceID) {
		problem(w, 404, "not_found", "Устройство не найдено")
		return
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	if err = lockActor(r.Context(), tx, a); err != nil {
		problem(w, 401, "unauthorized", "Войдите в аккаунт")
		return
	}
	var current int64
	err = tx.QueryRow(r.Context(), `SELECT version FROM devices WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL FOR UPDATE`, deviceID, a.User.ID).Scan(&current)
	if errors.Is(err, pgx.ErrNoRows) {
		problem(w, 404, "not_found", "Устройство не найдено")
		return
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	if current != version {
		problem(w, 409, "version_conflict", "Устройство изменено. Обновите список")
		return
	}
	_, err = tx.Exec(r.Context(), `UPDATE devices SET revoked_at=now(),version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2`, deviceID, a.User.ID)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE sessions SET revoked_at=now() WHERE device_id=$1 AND user_id=$2 AND revoked_at IS NULL`, deviceID, a.User.ID)
	}
	if err == nil {
		err = event(r.Context(), tx, a.User.ID, "device_revoked")
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	if deviceID == a.DeviceID {
		s.setCookie(w, "", time.Unix(1, 0))
	}
	respond(w, 204, nil)
}

func (s *Service) updateProfile(w http.ResponseWriter, r *http.Request, a Actor) {
	version, ok := expectedVersion(w, r)
	if !ok {
		return
	}
	var input struct {
		Timezone *string `json:"timezone"`
		Locale   *string `json:"locale"`
	}
	if !decode(w, r, &input) {
		return
	}
	if input.Timezone == nil && input.Locale == nil {
		problem(w, 422, "empty_patch", "Укажите настройку для изменения")
		return
	}
	timezone, locale := a.User.Timezone, a.User.Locale
	if input.Timezone != nil {
		timezone = *input.Timezone
		if len(timezone) > 100 || strings.Contains(timezone, "..") || strings.HasPrefix(timezone, "/") {
			problem(w, 422, "invalid_timezone", "Некорректный часовой пояс")
			return
		}
		if _, err := time.LoadLocation(timezone); err != nil {
			problem(w, 422, "invalid_timezone", "Некорректный часовой пояс")
			return
		}
	}
	if input.Locale != nil {
		locale = *input.Locale
		if locale != "ru" {
			problem(w, 422, "invalid_locale", "Язык пока только русский")
			return
		}
	}
	tx, err := s.Pool.Begin(r.Context())
	if err != nil {
		databaseFailure(w)
		return
	}
	defer tx.Rollback(context.Background())
	if err = lockActor(r.Context(), tx, a); err != nil {
		problem(w, 401, "unauthorized", "Войдите в аккаунт")
		return
	}
	err = tx.QueryRow(r.Context(), `UPDATE users SET timezone=$1,locale=$2,version=version+1,updated_at=now() WHERE id=$3 AND version=$4 RETURNING updated_at`, timezone, locale, a.User.ID, version).Scan(&a.User.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		problem(w, 409, "version_conflict", "Настройки изменены. Обновите страницу")
		return
	}
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		databaseFailure(w)
		return
	}
	a.User.Timezone = timezone
	a.User.Locale = locale
	a.User.Version = version + 1
	w.Header().Set("ETag", etag(a.User.Version))
	respond(w, 200, a.User)
}
