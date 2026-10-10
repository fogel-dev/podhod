package media

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/jobs"
	"github.com/jackc/pgx/v5"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const MaxBytes int64 = 10 << 20
const accountLimit int64 = 1 << 30
const globalLimit int64 = 2 << 30

var checksumPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

type Service struct {
	Core  *httpx.Core
	Auth  *auth.Service
	Store Storage
	Queue *jobs.Queue
	Key   []byte
}
type metadata struct {
	Photo
	User, Staging, Mime, Checksum string
	Image, Thumb                  *string
	Expires                       time.Time
	Deleted                       *time.Time
	Stored                        int64
}

func load(ctx context.Context, tx pgx.Tx, user, photo string, lock bool) (metadata, error) {
	var p metadata
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	err := tx.QueryRow(ctx, `SELECT `+Columns+`,user_id::text,staging_key,mime_type,checksum_sha256,image_key,thumbnail_key,upload_expires_at,deleted_at,stored_bytes FROM photos WHERE user_id=$1 AND id=$2`+suffix, user, photo).Scan(&p.ID, &p.Version, &p.CreatedAt, &p.UpdatedAt, &p.LocalDate, &p.WorkoutID, &p.Status, &p.SizeBytes, &p.Width, &p.Height, &p.Position, &p.ErrorCode, &p.User, &p.Staging, &p.Mime, &p.Checksum, &p.Image, &p.Thumb, &p.Expires, &p.Deleted, &p.Stored)
	if err == nil && p.Deleted != nil {
		err = pgx.ErrNoRows
	}
	return p, err
}
func (s *Service) RegisterRoutes(m *http.ServeMux) {
	m.HandleFunc("POST /api/v1/photos/uploads", s.Auth.Require(s.reserve))
	m.HandleFunc("POST /api/v1/photos/{id}/upload-url", s.Auth.Require(s.renew))
	m.HandleFunc("POST /api/v1/photos/{id}/complete", s.Auth.Require(s.complete))
	m.HandleFunc("GET /api/v1/photos", s.Auth.Require(s.list))
	m.HandleFunc("GET /api/v1/photos/{id}", s.Auth.Require(s.get))
	m.HandleFunc("PATCH /api/v1/photos/{id}", s.Auth.Require(s.patch))
	m.HandleFunc("DELETE /api/v1/photos/{id}", s.Auth.Require(s.delete))
	m.HandleFunc("POST /api/v1/photos/read-urls", s.Auth.Require(s.readURLs))
	m.HandleFunc("PUT /api/v1/photos/{id}/content", s.Auth.Require(s.upload))
	m.HandleFunc("GET /api/v1/photos/{id}/content/{variant}", s.Auth.Require(s.content))
}

type ticket struct {
	User      string `json:"u"`
	ID        string `json:"i"`
	Version   int64  `json:"v"`
	Operation string `json:"o"`
	Expiry    int64  `json:"e"`
}

func (s *Service) signature(p string) []byte {
	h := hmac.New(sha256.New, s.Key)
	h.Write([]byte("photo-capability:" + p))
	return h.Sum(nil)
}
func (s *Service) url(p metadata, op string, exp time.Time) string {
	b, _ := json.Marshal(ticket{p.User, p.ID, p.Version, op, exp.Unix()})
	v := base64.RawURLEncoding.EncodeToString(b)
	v += "." + base64.RawURLEncoding.EncodeToString(s.signature(v))
	path := "/api/v1/photos/" + p.ID + "/content"
	if op != "upload" {
		path += "/" + op
	}
	return s.Auth.Origin + path + "?token=" + v
}
func (s *Service) authorize(r *http.Request, p metadata, op string) error {
	v := r.URL.Query().Get("token")
	if len(v) > 2048 {
		return httpx.Fail(403, "invalid_photo_token")
	}
	parts := strings.Split(v, ".")
	if len(parts) != 2 {
		return httpx.Fail(403, "invalid_photo_token")
	}
	sig, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil || !hmac.Equal(sig, s.signature(parts[0])) {
		return httpx.Fail(403, "invalid_photo_token")
	}
	b, e := base64.RawURLEncoding.DecodeString(parts[0])
	var t ticket
	if e != nil || json.Unmarshal(b, &t) != nil || t.User != p.User || t.ID != p.ID || t.Version != p.Version || t.Operation != op {
		return httpx.Fail(403, "invalid_photo_token")
	}
	if t.Expiry <= time.Now().Unix() {
		return httpx.Fail(403, "photo_token_expired")
	}
	return nil
}

type Upload struct {
	PhotoID string            `json:"photoId"`
	Version int64             `json:"version"`
	URL     string            `json:"uploadUrl"`
	Headers map[string]string `json:"requiredHeaders"`
	Expires time.Time         `json:"expiresAt"`
}

func (s *Service) uploadReply(p metadata) Upload {
	return Upload{p.ID, p.Version, s.url(p, "upload", p.Expires), map[string]string{"Content-Type": p.Mime}, p.Expires}
}

// Quota reservations are serialized globally, including requests from different accounts.
// A pending image reserves the maximum processed size, not its compressed input size.
func quota(ctx context.Context, tx pgx.Tx, user, except string) error {
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(724018492)`); err != nil {
		return err
	}
	var own, all int64
	err := tx.QueryRow(ctx, `SELECT COALESCE(sum(n) FILTER(WHERE user_id=$1),0)::bigint,COALESCE(sum(n),0)::bigint FROM (SELECT user_id,CASE WHEN status IN ('pending','processing') THEN 2*10485760 ELSE stored_bytes END n FROM photos WHERE id<>$2::uuid UNION ALL SELECT user_id,stored_bytes FROM photos WHERE id=$2::uuid UNION ALL SELECT user_id,size_bytes FROM retired_photo_files) q`, user, except).Scan(&own, &all)
	if err != nil {
		return err
	}
	if own+2*MaxBytes > accountLimit || all+2*MaxBytes > globalLimit {
		return httpx.Fail(409, "photo_storage_quota")
	}
	return nil
}
func dayLimit(ctx context.Context, tx pgx.Tx, user, date, except string) error {
	var n int
	err := tx.QueryRow(ctx, `SELECT count(*) FROM photos WHERE user_id=$1 AND local_date=$2::date AND id<>$3::uuid AND deleted_at IS NULL`, user, date, except).Scan(&n)
	if err != nil {
		return err
	}
	if n >= 20 {
		return httpx.Fail(409, "photo_day_quota")
	}
	return nil
}

type jobPayload struct {
	ID      string `json:"id"`
	Staging string `json:"staging"`
}

func (s *Service) enqueue(ctx context.Context, tx pgx.Tx, p metadata, kind string, at time.Time) (string, error) {
	j := id.New()
	b, _ := json.Marshal(jobPayload{p.ID, p.Staging})
	_, err := s.Queue.Enqueue(ctx, tx, jobs.Input{ID: j, UserID: &p.User, Kind: kind, Payload: b, DedupeKey: kind + ":" + p.ID + ":" + p.Staging, AvailableAt: at})
	return j, err
}
func (s *Service) changed(ctx context.Context, tx pgx.Tx, p metadata, operation string) error {
	return httpx.Change(ctx, tx, p.User, "photo", p.ID, operation, p.Version)
}
func (s *Service) reserve(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		ID       string  `json:"id"`
		Date     string  `json:"localDate"`
		Workout  *string `json:"workoutId"`
		Mime     string  `json:"mimeType"`
		Size     int64   `json:"sizeBytes"`
		Checksum string  `json:"checksumSha256"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	_, e := httpx.Date(in.Date)
	if e != nil || !httpx.UUID(in.ID) || in.Size < 1 || in.Size > MaxBytes || !checksumPattern.MatchString(in.Checksum) || (in.Mime != "image/jpeg" && in.Mime != "image/png" && in.Mime != "image/webp") || (in.Workout != nil && !httpx.UUID(*in.Workout)) {
		httpx.Error(w, httpx.Fail(422, "invalid_photo"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		ctx := r.Context()
		if e := quota(ctx, tx, a.User.ID, in.ID); e != nil {
			return httpx.Result{}, e
		}
		if e := dayLimit(ctx, tx, a.User.ID, in.Date, in.ID); e != nil {
			return httpx.Result{}, e
		}
		if in.Workout != nil {
			var found bool
			if e := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM workouts WHERE user_id=$1 AND id=$2 AND local_date=$3::date AND status<>'discarded')`, a.User.ID, *in.Workout, in.Date).Scan(&found); e != nil {
				return httpx.Result{}, e
			}
			if !found {
				return httpx.Result{}, pgx.ErrNoRows
			}
		}
		var position int
		if e := tx.QueryRow(ctx, `SELECT COALESCE((SELECT n FROM generate_series(1,20) n WHERE NOT EXISTS(SELECT 1 FROM photos WHERE user_id=$1 AND local_date=$2::date AND deleted_at IS NULL AND position=n) ORDER BY n LIMIT 1),1)`, a.User.ID, in.Date).Scan(&position); e != nil {
			return httpx.Result{}, e
		}
		_, e := tx.Exec(ctx, `INSERT INTO photos(id,user_id,local_date,workout_id,status,size_bytes,mime_type,checksum_sha256,staging_key,upload_expires_at,position) VALUES($1,$2,$3::date,$4,'pending',$5,$6,$7,$8,$9,$10)`, in.ID, a.User.ID, in.Date, in.Workout, in.Size, in.Mime, in.Checksum, key(), time.Now().UTC().Add(10*time.Minute), position)
		if e != nil {
			return httpx.Result{}, e
		}
		p, e := load(ctx, tx, a.User.ID, in.ID, false)
		if e == nil {
			_, e = s.enqueue(ctx, tx, p, "photo.expire", p.Expires)
		}
		if e == nil {
			e = s.changed(ctx, tx, p, "upsert")
		}
		return httpx.Reply(201, s.uploadReply(p), p.Version), e
	})
}

type Complete struct {
	Version  int64  `json:"expectedVersion"`
	Checksum string `json:"checksumSha256"`
}

func (s *Service) transition(w http.ResponseWriter, r *http.Request, a auth.Actor, renew bool) {
	var in Complete
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !httpx.UUID(r.PathValue("id")) || in.Version < 1 || in.Version > 9007199254740991 || !checksumPattern.MatchString(in.Checksum) {
		httpx.Error(w, httpx.Fail(422, "invalid_photo"))
		return
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		ctx := r.Context()
		p, e := load(ctx, tx, a.User.ID, r.PathValue("id"), true)
		if e != nil {
			return httpx.Result{}, e
		}
		if p.Version != in.Version {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		if in.Checksum != p.Checksum {
			return httpx.Result{}, httpx.Fail(422, "checksum_mismatch")
		}
		if renew {
			if p.Status != "pending" && p.Status != "failed" {
				return httpx.Result{}, httpx.Fail(409, "photo_not_pending")
			}
			if e = quota(ctx, tx, p.User, p.ID); e != nil {
				return httpx.Result{}, e
			}
			// The old generation is retired through an independent cleanup job.
			if _, e = tx.Exec(ctx, `INSERT INTO retired_photo_files(key,user_id,size_bytes) VALUES($1,$2,$3)`, p.Staging, p.User, p.Stored); e != nil {
				return httpx.Result{}, e
			}
			if _, e = s.enqueue(ctx, tx, p, "photo.staging_cleanup", time.Now()); e != nil {
				return httpx.Result{}, e
			}
			_, e = tx.Exec(ctx, `UPDATE photos SET status='pending',staging_key=$3,stored_bytes=0,upload_expires_at=$4,error_code=NULL,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, p.User, p.ID, key(), time.Now().UTC().Add(10*time.Minute))
			if e != nil {
				return httpx.Result{}, e
			}
			p, e = load(ctx, tx, p.User, p.ID, false)
			if e == nil {
				_, e = s.enqueue(ctx, tx, p, "photo.expire", p.Expires)
			}
			if e == nil {
				e = s.changed(ctx, tx, p, "upsert")
			}
			return httpx.Reply(200, s.uploadReply(p), p.Version), e
		}
		if p.Status != "pending" || !p.Expires.After(time.Now()) {
			return httpx.Result{}, httpx.Fail(409, "photo_not_pending")
		}
		b, e := read(s.Store, p.Staging)
		if e != nil {
			return httpx.Result{}, httpx.Fail(409, "upload_missing")
		}
		hash := sha256.Sum256(b)
		if int64(len(b)) != p.SizeBytes || hex.EncodeToString(hash[:]) != p.Checksum {
			return httpx.Result{}, httpx.Fail(422, "checksum_mismatch")
		}
		j, e := s.enqueue(ctx, tx, p, "photo.process", time.Now())
		if e != nil {
			return httpx.Result{}, e
		}
		_, e = tx.Exec(ctx, `UPDATE photos SET status='processing',processing_job_id=$3,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, p.User, p.ID, j)
		if e == nil {
			p, e = load(ctx, tx, p.User, p.ID, false)
		}
		if e == nil {
			e = s.changed(ctx, tx, p, "upsert")
		}
		return httpx.Reply(202, p.Photo, p.Version), e
	})
}
func (s *Service) renew(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	s.transition(w, r, a, true)
}
func (s *Service) complete(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	s.transition(w, r, a, false)
}
func (s *Service) get(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	p, e := Scan(s.Core.Pool.QueryRow(r.Context(), `SELECT `+Columns+` FROM photos WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL`, a.User.ID, r.PathValue("id")))
	if e != nil {
		httpx.Error(w, e)
		return
	}
	w.Header().Set("ETag", httpx.ETag(p.Version))
	httpx.JSON(w, 200, p)
}
func (s *Service) list(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	date := r.URL.Query().Get("date")
	if _, e := httpx.Date(date); e != nil {
		httpx.Error(w, e)
		return
	}
	limit, after, e := s.Core.Page(r, a.User.ID, "photos", date)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	rows, e := s.Core.Pool.Query(r.Context(), `SELECT `+Columns+` FROM photos WHERE user_id=$1 AND local_date=$2::date AND id>$3 AND deleted_at IS NULL ORDER BY id LIMIT $4`, a.User.ID, date, after, limit+1)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer rows.Close()
	page := Page{Items: []Photo{}}
	for rows.Next() {
		p, e := Scan(rows)
		if e != nil {
			httpx.Error(w, e)
			return
		}
		page.Items = append(page.Items, p)
	}
	if rows.Err() != nil {
		httpx.Error(w, rows.Err())
		return
	}
	if len(page.Items) > limit {
		page.Items = page.Items[:limit]
		v := s.Core.Cursor(a.User.ID, "photos", date, page.Items[limit-1].ID)
		page.NextCursor = &v
	}
	httpx.JSON(w, 200, page)
}
func (s *Service) patch(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		Date     *string `json:"localDate"`
		Position *int    `json:"position"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	v, e := httpx.Version(r)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	if !httpx.UUID(r.PathValue("id")) || (in.Date == nil && in.Position == nil) || (in.Position != nil && (*in.Position < 1 || *in.Position > 20)) {
		httpx.Error(w, httpx.Fail(422, "invalid_photo"))
		return
	}
	if in.Date != nil {
		if _, e = httpx.Date(*in.Date); e != nil {
			httpx.Error(w, e)
			return
		}
	}
	s.Core.Rest(w, r, a, in, func(tx pgx.Tx) (httpx.Result, error) {
		ctx := r.Context()
		p, e := load(ctx, tx, a.User.ID, r.PathValue("id"), true)
		if e != nil {
			return httpx.Result{}, e
		}
		if p.Version != v {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		if in.Date != nil && *in.Date != p.LocalDate {
			if e = dayLimit(ctx, tx, p.User, *in.Date, p.ID); e != nil {
				return httpx.Result{}, e
			}
			p.LocalDate = *in.Date
			p.WorkoutID = nil
		}
		if in.Position != nil {
			p.Position = *in.Position
		}
		_, e = tx.Exec(ctx, `UPDATE photos SET local_date=$3::date,workout_id=$4,position=$5,version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, p.User, p.ID, p.LocalDate, p.WorkoutID, p.Position)
		if e == nil {
			p, e = load(ctx, tx, p.User, p.ID, false)
		}
		if e == nil {
			e = s.changed(ctx, tx, p, "upsert")
		}
		return httpx.Reply(200, p.Photo, p.Version), e
	})
}
func (s *Service) delete(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	v, e := httpx.Version(r)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	s.Core.Rest(w, r, a, struct{}{}, func(tx pgx.Tx) (httpx.Result, error) {
		ctx := r.Context()
		p, e := load(ctx, tx, a.User.ID, r.PathValue("id"), true)
		if e != nil {
			return httpx.Result{}, e
		}
		if p.Version != v {
			return httpx.Result{}, httpx.Fail(409, "version_conflict")
		}
		_, e = tx.Exec(ctx, `UPDATE photos SET status='deleting',deleted_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`, p.User, p.ID)
		p.Version++
		if e == nil {
			_, e = s.enqueue(ctx, tx, p, "photo.delete", time.Now().Add(7*24*time.Hour))
		}
		if e == nil {
			e = s.changed(ctx, tx, p, "delete")
		}
		return httpx.Reply(204, nil, p.Version), e
	})
}
func (s *Service) upload(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	tx, e := s.Core.Pool.Begin(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	_, e = tx.Exec(r.Context(), `SET LOCAL statement_timeout='10s'`)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	// Serialize with logout/revocation and every domain command, then recheck the session.
	var ok bool
	e = tx.QueryRow(r.Context(), `SELECT status='active' FROM users WHERE id=$1 FOR UPDATE`, a.User.ID).Scan(&ok)
	if e != nil || !ok {
		httpx.Error(w, httpx.Fail(401, "unauthorized"))
		return
	}
	e = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM sessions s JOIN devices d ON d.id=s.device_id AND d.user_id=s.user_id WHERE s.id=$1 AND s.revoked_at IS NULL AND s.expires_at>now() AND d.revoked_at IS NULL)`, a.SessionID).Scan(&ok)
	if e != nil || !ok {
		httpx.Error(w, httpx.Fail(401, "unauthorized"))
		return
	}
	p, e := load(r.Context(), tx, a.User.ID, r.PathValue("id"), true)
	if e == nil {
		e = s.authorize(r, p, "upload")
	}
	if e != nil {
		httpx.Error(w, e)
		return
	}
	if p.Status != "pending" || !p.Expires.After(time.Now()) {
		httpx.Error(w, httpx.Fail(409, "photo_not_pending"))
		return
	}
	if r.Header.Get("Content-Type") != p.Mime {
		httpx.Error(w, httpx.Fail(415, "mime_mismatch"))
		return
	}
	b, e := io.ReadAll(http.MaxBytesReader(w, r.Body, p.SizeBytes))
	if e != nil {
		httpx.Error(w, httpx.Fail(413, "body_too_large"))
		return
	}
	hash := sha256.Sum256(b)
	if int64(len(b)) != p.SizeBytes || hex.EncodeToString(hash[:]) != p.Checksum {
		httpx.Error(w, httpx.Fail(422, "checksum_mismatch"))
		return
	}
	if e = s.Store.Put(p.Staging, b); e == nil {
		_, e = tx.Exec(r.Context(), `UPDATE photos SET stored_bytes=$3 WHERE user_id=$1 AND id=$2`, p.User, p.ID, p.SizeBytes)
	}
	if e == nil {
		e = tx.Commit(r.Context())
	}
	if e != nil {
		httpx.Error(w, e)
		return
	}
	httpx.JSON(w, 204, nil)
}
func (s *Service) readURLs(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	var in struct {
		IDs     []string `json:"photoIds"`
		Variant string   `json:"variant"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if len(in.IDs) < 1 || len(in.IDs) > 50 || (in.Variant != "image" && in.Variant != "thumbnail") {
		httpx.Error(w, httpx.Fail(422, "invalid_photos"))
		return
	}
	seen := map[string]bool{}
	for _, p := range in.IDs {
		if !httpx.UUID(p) || seen[p] {
			httpx.Error(w, httpx.Fail(422, "invalid_photos"))
			return
		}
		seen[p] = true
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	items := []map[string]any{}
	for _, id := range in.IDs {
		p, e := load(r.Context(), tx, a.User.ID, id, false)
		if e != nil {
			httpx.Error(w, e)
			return
		}
		if p.Status != "ready" {
			httpx.Error(w, httpx.Fail(409, "photo_not_ready"))
			return
		}
		exp := time.Now().UTC().Add(2 * time.Minute)
		items = append(items, map[string]any{"photoId": p.ID, "url": s.url(p, in.Variant, exp), "expiresAt": exp})
	}
	httpx.JSON(w, 200, map[string]any{"items": items})
}
func (s *Service) content(w http.ResponseWriter, r *http.Request, a auth.Actor) {
	if !httpx.UUID(r.PathValue("id")) {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	variant := r.PathValue("variant")
	if variant != "image" && variant != "thumbnail" {
		httpx.Error(w, pgx.ErrNoRows)
		return
	}
	tx, e := s.Core.Read(r.Context())
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer tx.Rollback(context.Background())
	p, e := load(r.Context(), tx, a.User.ID, r.PathValue("id"), false)
	if e == nil {
		e = s.authorize(r, p, variant)
	}
	if e != nil {
		httpx.Error(w, e)
		return
	}
	if p.Status != "ready" {
		httpx.Error(w, httpx.Fail(409, "photo_not_ready"))
		return
	}
	k := p.Image
	if variant == "thumbnail" {
		k = p.Thumb
	}
	f, e := s.Store.Open(*k)
	if e != nil {
		httpx.Error(w, e)
		return
	}
	defer f.Close()
	stat, e := f.Stat()
	if e != nil {
		httpx.Error(w, e)
		return
	}
	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Length", fmt.Sprint(stat.Size()))
	w.WriteHeader(200)
	_, _ = io.Copy(w, f)
}
