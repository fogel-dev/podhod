package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/jobs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"os"
	"time"
)

type Worker struct {
	Pool  *pgxpool.Pool
	Store Storage
}

func (w *Worker) Handlers() map[string]jobs.Handler {
	return map[string]jobs.Handler{"photo.process": w.process, "photo.expire": w.expire, "photo.delete": w.remove, "photo.staging_cleanup": w.stagingCleanup}
}
func (w *Worker) lookup(ctx context.Context, b []byte) (jobPayload, metadata, error) {
	var in jobPayload
	err := json.Unmarshal(b, &in)
	if err != nil || !httpx.UUID(in.ID) || !validKey.MatchString(in.Staging) {
		return in, metadata{}, &jobs.Failure{Code: "invalid_photo_payload", Permanent: true}
	}
	var user string
	err = w.Pool.QueryRow(ctx, `SELECT user_id::text FROM photos WHERE id=$1`, in.ID).Scan(&user)
	if err != nil {
		return in, metadata{}, err
	}
	tx, err := w.Pool.Begin(ctx)
	if err != nil {
		return in, metadata{}, err
	}
	defer tx.Rollback(context.Background())
	p, err := load(ctx, tx, user, in.ID, false)
	return in, p, err
}
func (w *Worker) fail(ctx context.Context, p metadata, code string) error {
	tx, e := w.Pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(context.Background())
	current, e := load(ctx, tx, p.User, p.ID, true)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if current.Staging != p.Staging || (current.Status != "pending" && current.Status != "processing") {
		return nil
	}
	if code == "upload_expired" && (current.Status != "pending" || current.Expires.After(time.Now())) {
		return nil
	}
	_, e = tx.Exec(ctx, `UPDATE photos SET status='failed',error_code=$3,version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2`, p.ID, p.User, code)
	if e == nil {
		e = httpx.Change(ctx, tx, p.User, "photo", p.ID, "upsert", current.Version+1)
	}
	if e == nil {
		e = tx.Commit(ctx)
	}
	return e
}
func (w *Worker) process(ctx context.Context, b []byte) error {
	in, p, e := w.lookup(ctx, b)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if p.Staging != in.Staging || p.Status != "processing" {
		return nil
	}
	data, e := read(w.Store, p.Staging)
	if e != nil {
		if errors.Is(e, os.ErrNotExist) {
			return w.fail(ctx, p, "upload_missing")
		}
		return e
	}
	hash := sha256.Sum256(data)
	if int64(len(data)) != p.SizeBytes || hex.EncodeToString(hash[:]) != p.Checksum {
		return w.fail(ctx, p, "checksum_mismatch")
	}
	full, thumb, width, height, e := processImage(data, p.Mime)
	if e != nil {
		return w.fail(ctx, p, "invalid_image")
	}
	if int64(len(full)+len(thumb)) > MaxBytes {
		return w.fail(ctx, p, "processed_image_too_large")
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	imageKey, thumbKey := key(), key()
	published := false
	defer func() {
		if !published {
			_ = w.Store.Remove(imageKey)
			_ = w.Store.Remove(thumbKey)
		}
	}()
	if e = w.Store.Put(imageKey, full); e != nil {
		return e
	}
	if e = w.Store.Put(thumbKey, thumb); e != nil {
		return e
	}
	tx, e := w.Pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(context.Background())
	current, e := load(ctx, tx, p.User, p.ID, true)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if current.Staging != p.Staging || current.Status != "processing" {
		return nil
	}
	var active bool
	e = tx.QueryRow(ctx, `SELECT status='active' FROM users WHERE id=$1`, p.User).Scan(&active)
	if e != nil {
		return e
	}
	if !active {
		return nil
	}
	_, e = tx.Exec(ctx, `UPDATE photos SET status='ready',image_key=$3,thumbnail_key=$4,width=$5,height=$6,stored_bytes=$7,error_code=NULL,version=version+1,updated_at=now() WHERE id=$1 AND user_id=$2`, p.ID, p.User, imageKey, thumbKey, width, height, int64(len(full)+len(thumb))+p.SizeBytes)
	if e == nil {
		e = httpx.Change(ctx, tx, p.User, "photo", p.ID, "upsert", current.Version+1)
	}
	if e == nil {
		e = tx.Commit(ctx)
	}
	if e != nil {
		return e
	}
	published = true
	return w.cleanReady(ctx, p.ID, p.User, p.Staging, imageKey, thumbKey)
}
func (w *Worker) cleanReady(ctx context.Context, id, user, stage, image, thumb string) error {
	if e := w.Store.Remove(stage); e != nil {
		return e
	}
	var size int64
	for _, k := range []string{image, thumb} {
		f, e := w.Store.Open(k)
		if e != nil {
			return e
		}
		stat, e := f.Stat()
		f.Close()
		if e != nil {
			return e
		}
		size += stat.Size()
	}
	_, e := w.Pool.Exec(ctx, `UPDATE photos SET stored_bytes=$3,staging_cleaned=true WHERE id=$1 AND user_id=$2 AND status='ready' AND staging_key=$4 AND image_key=$5 AND thumbnail_key=$6`, id, user, size, stage, image, thumb)
	return e
}
func (w *Worker) expire(ctx context.Context, b []byte) error {
	in, p, e := w.lookup(ctx, b)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if p.Staging != in.Staging || p.Status != "pending" || p.Expires.After(time.Now()) {
		return nil
	}
	if e = w.fail(ctx, p, "upload_expired"); e != nil {
		return e
	}
	return w.clearFailed(ctx, p.ID, p.User, p.Staging)
}
func (w *Worker) clearFailed(ctx context.Context, id, user, stage string) error {
	tx, e := w.Pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(context.Background())
	p, e := load(ctx, tx, user, id, true)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if p.Staging != stage || p.Status != "failed" {
		return nil
	}
	if e = w.Store.Remove(stage); e != nil {
		return e
	}
	_, e = tx.Exec(ctx, `UPDATE photos SET stored_bytes=0 WHERE id=$1 AND user_id=$2`, id, user)
	if e == nil {
		e = tx.Commit(ctx)
	}
	return e
}
func (w *Worker) stagingCleanup(ctx context.Context, b []byte) error {
	var in jobPayload
	if json.Unmarshal(b, &in) != nil || !httpx.UUID(in.ID) || !validKey.MatchString(in.Staging) {
		return &jobs.Failure{Code: "invalid_photo_payload", Permanent: true}
	}
	var current bool
	e := w.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM photos WHERE staging_key=$1)`, in.Staging).Scan(&current)
	if e != nil {
		return e
	}
	if current {
		return nil
	}
	if e = w.Store.Remove(in.Staging); e != nil {
		return e
	}
	_, e = w.Pool.Exec(ctx, `DELETE FROM retired_photo_files WHERE key=$1`, in.Staging)
	return e
}
func (w *Worker) remove(ctx context.Context, b []byte) error {
	var in jobPayload
	if json.Unmarshal(b, &in) != nil || !httpx.UUID(in.ID) {
		return &jobs.Failure{Code: "invalid_photo_payload", Permanent: true}
	}
	tx, e := w.Pool.Begin(ctx)
	if e != nil {
		return e
	}
	defer tx.Rollback(context.Background())
	var stage string
	var image, thumb *string
	var deleted *time.Time
	e = tx.QueryRow(ctx, `SELECT staging_key,image_key,thumbnail_key,deleted_at FROM photos WHERE id=$1 FOR UPDATE`, in.ID).Scan(&stage, &image, &thumb, &deleted)
	if errors.Is(e, pgx.ErrNoRows) {
		return nil
	}
	if e != nil {
		return e
	}
	if deleted == nil || time.Since(*deleted) < 7*24*time.Hour {
		return nil
	}
	keys := []string{stage}
	if image != nil {
		keys = append(keys, *image)
	}
	if thumb != nil {
		keys = append(keys, *thumb)
	}
	for _, k := range keys {
		if e = w.Store.Remove(k); e != nil {
			return e
		}
	}
	_, e = tx.Exec(ctx, `UPDATE photos SET stored_bytes=0 WHERE id=$1`, in.ID)
	if e == nil {
		e = tx.Commit(ctx)
	}
	return e
}

// Maintain repairs interrupted cleanup and terminal queue failures, even after restart.
func (w *Worker) Maintain(ctx context.Context) error {
	retired, e := w.Pool.Query(ctx, `SELECT key FROM retired_photo_files LIMIT 1000`)
	if e != nil {
		return e
	}
	keys := []string{}
	for retired.Next() {
		var k string
		if e = retired.Scan(&k); e != nil {
			retired.Close()
			return e
		}
		keys = append(keys, k)
	}
	e = retired.Err()
	retired.Close()
	if e != nil {
		return e
	}
	for _, k := range keys {
		if e = w.Store.Remove(k); e != nil {
			return e
		}
		if _, e = w.Pool.Exec(ctx, `DELETE FROM retired_photo_files WHERE key=$1`, k); e != nil {
			return e
		}
	}
	rows, e := w.Pool.Query(ctx, `SELECT p.id::text,p.user_id::text,p.staging_key,p.status,p.image_key,p.thumbnail_key,COALESCE(j.state='dead',false) FROM photos p LEFT JOIN jobs j ON j.id=p.processing_job_id WHERE (((p.status='ready' AND NOT p.staging_cleaned) OR (p.status='failed' AND p.stored_bytes>0) OR (p.status='processing' AND j.state='dead') OR (p.status='pending' AND p.upload_expires_at<=now())) AND p.deleted_at IS NULL) OR (p.status='deleting' AND p.deleted_at<now()-interval '7 days' AND p.stored_bytes>0) ORDER BY p.updated_at,p.id LIMIT 1000`)
	if e != nil {
		return e
	}
	type item struct {
		id, user, stage, status string
		image, thumb            *string
		dead                    bool
	}
	items := []item{}
	for rows.Next() {
		var p item
		if e = rows.Scan(&p.id, &p.user, &p.stage, &p.status, &p.image, &p.thumb, &p.dead); e != nil {
			rows.Close()
			return e
		}
		items = append(items, p)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return e
	}
	for _, p := range items {
		switch {
		case p.status == "pending":
			b, _ := json.Marshal(jobPayload{p.id, p.stage})
			e = w.expire(ctx, b)
		case p.status == "processing" && p.dead:
			e = w.fail(ctx, metadata{Photo: Photo{ID: p.id}, User: p.user, Staging: p.stage}, "processing_failed")
		case p.status == "failed":
			e = w.clearFailed(ctx, p.id, p.user, p.stage)
		case p.status == "ready":
			e = w.cleanReady(ctx, p.id, p.user, p.stage, *p.image, *p.thumb)
		case p.status == "deleting":
			b, _ := json.Marshal(jobPayload{p.id, p.stage})
			e = w.remove(ctx, b)
		}
		if e != nil {
			return e
		}
	}
	if disk, ok := w.Store.(*Disk); ok {
		dir, e := disk.Root.Open(".")
		if e != nil {
			return e
		}
		entries, e := dir.ReadDir(-1)
		dir.Close()
		if e != nil {
			return e
		}
		for _, entry := range entries {
			if !validKey.MatchString(entry.Name()) {
				continue
			}
			info, e := entry.Info()
			if e != nil {
				return e
			}
			if time.Since(info.ModTime()) < 7*24*time.Hour {
				continue
			}
			var used bool
			e = w.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM photos WHERE staging_key=$1 OR image_key=$1 OR thumbnail_key=$1)`, entry.Name()).Scan(&used)
			if e != nil {
				return e
			}
			if !used {
				if e = disk.Remove(entry.Name()); e != nil {
					return e
				}
			}
		}
	}
	return nil
}
