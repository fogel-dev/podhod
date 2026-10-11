// Package httpx implements shared HTTP boundaries and transactional command receipts.
package httpx

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Failure struct {
	Status int
	Code   string
}

func (e *Failure) Error() string         { return e.Code }
func Fail(status int, code string) error { return &Failure{status, code} }
func Error(w http.ResponseWriter, err error) {
	status, code := 500, "internal_error"
	var f *Failure
	var db *pgconn.PgError
	switch {
	case errors.As(err, &f):
		status, code = f.Status, f.Code
	case errors.Is(err, pgx.ErrNoRows):
		status, code = 404, "not_found"
	case errors.As(err, &db):
		if db.Code == "23505" {
			status, code = 409, "conflict"
		}
	}
	message := "Не удалось выполнить запрос"
	if code == "photo_day_quota" {
		message = "На этот день можно добавить максимум 2 фотографии. Удалите одну, чтобы добавить новую."
	}
	JSON(w, status, map[string]any{"error": map[string]any{"code": code, "message": message, "requestId": id.New()}})
}
func JSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if status != 204 {
		_ = json.NewEncoder(w).Encode(value)
	}
}
func Decode(w http.ResponseWriter, r *http.Request, value any) bool {
	content, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || content != "application/json" {
		Error(w, Fail(415, "unsupported_media_type"))
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		Error(w, Fail(413, "body_too_large"))
		return false
	}
	if err = Strict(data, value); err != nil {
		Error(w, err)
		return false
	}
	return true
}
func Strict(data []byte, value any) error {
	if bytes.Equal(bytes.TrimSpace(data), []byte("null")) {
		return Fail(400, "invalid_json")
	}
	d := json.NewDecoder(bytes.NewReader(data))
	d.DisallowUnknownFields()
	if err := d.Decode(value); err != nil {
		return Fail(400, "invalid_json")
	}
	var x any
	if d.Decode(&x) != io.EOF {
		return Fail(400, "invalid_json")
	}
	return nil
}

var uuid = regexp.MustCompile(`^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$`)

func UUID(s string) bool { return uuid.MatchString(s) }
func Text(s string, min, max int) bool {
	n := utf8.RuneCountInString(s)
	return utf8.ValidString(s) && n >= min && n <= max && (!strings.ContainsRune(s, 0))
}
func Version(r *http.Request) (int64, error) {
	v := r.Header.Get("If-Match")
	if v == "" {
		return 0, Fail(428, "precondition_required")
	}
	n, e := strconv.ParseInt(strings.Trim(v, `"`), 10, 64)
	if e != nil || n < 0 || n > 9007199254740991 || v != ETag(n) {
		return 0, Fail(400, "invalid_version")
	}
	return n, nil
}
func ETag(v int64) string { return `"` + strconv.FormatInt(v, 10) + `"` }
func Date(s string) (time.Time, error) {
	t, e := time.Parse("2006-01-02", s)
	if e != nil || t.Format("2006-01-02") != s {
		return t, Fail(422, "invalid_date")
	}
	return t, nil
}

type Result struct {
	Status  int             `json:"status"`
	Value   json.RawMessage `json:"value"`
	Version int64           `json:"version"`
}

func Reply(status int, value any, version int64) Result {
	body, _ := json.Marshal(value)
	return Result{status, body, version}
}

type Core struct {
	Pool *pgxpool.Pool
	key  []byte
}

func New(pool *pgxpool.Pool, key string) *Core { k, _ := hex.DecodeString(key); return &Core{pool, k} }
func (c *Core) Read(ctx context.Context) (pgx.Tx, error) {
	tx, e := c.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if e != nil {
		return nil, e
	}
	if _, e = tx.Exec(ctx, `SET LOCAL statement_timeout='5s'`); e != nil {
		_ = tx.Rollback(context.Background())
		return nil, e
	}
	return tx, nil
}
func (c *Core) Rest(w http.ResponseWriter, r *http.Request, a auth.Actor, input any, fn func(pgx.Tx) (Result, error)) {
	c.Command(w, r, a, r.Header.Get("Idempotency-Key"), r.Header.Get("X-Device-Id"), input, fn)
}
func (c *Core) Command(w http.ResponseWriter, r *http.Request, a auth.Actor, command, device string, input any, fn func(pgx.Tx) (Result, error)) {
	if !UUID(command) || device != a.DeviceID {
		Error(w, Fail(400, "invalid_command_device"))
		return
	}
	payload, _ := json.Marshal(input)
	hash := sha256.Sum256(append([]byte(r.Method+" "+r.URL.Path+" "+r.Header.Get("If-Match")+"\n"), payload...))
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	tx, err := c.Pool.Begin(ctx)
	if err != nil {
		Error(w, err)
		return
	}
	defer tx.Rollback(context.Background())
	if _, err = tx.Exec(ctx, `SET LOCAL statement_timeout='5s'`); err != nil {
		Error(w, err)
		return
	}
	var user string
	err = tx.QueryRow(ctx, `SELECT id::text FROM users WHERE id=$1 AND status='active' FOR UPDATE`, a.User.ID).Scan(&user)
	if err != nil {
		Error(w, err)
		return
	}
	var valid bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM sessions s JOIN devices d ON d.id=s.device_id AND d.user_id=s.user_id WHERE s.id=$1 AND s.user_id=$2 AND s.device_id=$3 AND s.revoked_at IS NULL AND s.expires_at>now() AND d.revoked_at IS NULL)`, a.SessionID, user, device).Scan(&valid)
	if err != nil {
		Error(w, err)
		return
	}
	if !valid {
		Error(w, Fail(401, "unauthorized"))
		return
	}
	var previousHash, previousResult []byte
	err = tx.QueryRow(ctx, `SELECT payload_hash,result FROM command_receipts WHERE user_id=$1 AND command_id=$2`, user, command).Scan(&previousHash, &previousResult)
	var result Result
	if err == nil {
		if !hmac.Equal(previousHash, hash[:]) {
			Error(w, Fail(409, "idempotency_key_reused"))
			return
		}
		if json.Unmarshal(previousResult, &result) != nil {
			Error(w, Fail(500, "invalid_receipt"))
			return
		}
	} else if errors.Is(err, pgx.ErrNoRows) {
		result, err = fn(tx)
		if err != nil {
			Error(w, err)
			return
		}
		encoded, _ := json.Marshal(result)
		_, err = tx.Exec(ctx, `INSERT INTO command_receipts(user_id,command_id,device_id,payload_hash,result) VALUES($1,$2,$3,$4,$5)`, user, command, device, hash[:], encoded)
	} else {
		Error(w, err)
		return
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	if err != nil {
		Error(w, err)
		return
	}
	if result.Version > 0 {
		w.Header().Set("ETag", ETag(result.Version))
	}
	JSON(w, result.Status, result.Value)
}
func Change(ctx context.Context, tx pgx.Tx, user, kind, entity, operation string, version int64) error {
	var seq int64
	err := tx.QueryRow(ctx, `UPDATE sync_heads SET seq=seq+1 WHERE user_id=$1 RETURNING seq`, user).Scan(&seq)
	if err == nil {
		_, err = tx.Exec(ctx, `INSERT INTO change_log(user_id,seq,entity_type,entity_id,operation,entity_version) VALUES($1,$2,$3,$4,$5,$6)`, user, seq, kind, entity, operation, version)
	}
	return err
}

type Cursor struct {
	User    string `json:"u"`
	Scope   string `json:"s"`
	Filter  string `json:"f"`
	After   string `json:"a"`
	Expires int64  `json:"e"`
}

func (c *Core) sign(s string) []byte {
	h := hmac.New(sha256.New, c.key)
	h.Write([]byte("page-cursor:" + s))
	return h.Sum(nil)
}
func (c *Core) Cursor(user, scope, filter, after string) string {
	p, _ := json.Marshal(Cursor{user, scope, filter, after, time.Now().Add(24 * time.Hour).Unix()})
	s := base64.RawURLEncoding.EncodeToString(p)
	return s + "." + base64.RawURLEncoding.EncodeToString(c.sign(s))
}
func (c *Core) Page(r *http.Request, user, scope, filter string) (int, string, error) {
	limit := 30
	if v := r.URL.Query().Get("limit"); v != "" {
		n, e := strconv.Atoi(v)
		if e != nil || n < 1 || n > 100 {
			return 0, "", Fail(422, "invalid_limit")
		}
		limit = n
	}
	after := "00000000-0000-0000-0000-000000000000"
	v := r.URL.Query().Get("cursor")
	if v == "" {
		return limit, after, nil
	}
	if len(v) > 4096 {
		return 0, "", Fail(400, "invalid_cursor")
	}
	parts := strings.Split(v, ".")
	if len(parts) != 2 {
		return 0, "", Fail(400, "invalid_cursor")
	}
	sig, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil || !hmac.Equal(sig, c.sign(parts[0])) {
		return 0, "", Fail(400, "invalid_cursor")
	}
	p, e := base64.RawURLEncoding.DecodeString(parts[0])
	var cur Cursor
	if e != nil || json.Unmarshal(p, &cur) != nil || cur.User != user || cur.Scope != scope || cur.Filter != filter || !UUID(cur.After) {
		return 0, "", Fail(400, "invalid_cursor")
	}
	if cur.Expires < time.Now().Unix() {
		return 0, "", Fail(410, "cursor_expired")
	}
	return limit, cur.After, nil
}
