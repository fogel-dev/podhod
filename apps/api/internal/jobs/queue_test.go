package jobs

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/testdb"
	"github.com/jackc/pgx/v5/pgxpool"
)

func queues(t *testing.T) (*Queue, *pgxpool.Pool) {
	t.Helper()
	url := testdb.New(t)
	ctx := context.Background()
	if err := database.Migrate(ctx, url); err != nil {
		t.Fatal(err)
	}
	admin, err := database.Open(ctx, url, 4)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)
	pool, err := database.Open(ctx, url+"&role=podhod_worker", 4)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	cipher, err := NewCipher(strings.Repeat("12", 32))
	if err != nil {
		t.Fatal(err)
	}
	return New(pool, cipher), admin
}

func enqueue(t *testing.T, q *Queue, admin *pgxpool.Pool, kind string, expiry *time.Time) string {
	t.Helper()
	ctx := context.Background()
	tx, err := admin.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	jobID := id.New()
	in := Input{ID: jobID, Kind: kind, Payload: []byte("private test payload"), DedupeKey: jobID, ExpiresAt: expiry}
	added, err := q.Enqueue(ctx, tx, in)
	if err != nil || !added {
		t.Fatalf("enqueue added=%v err=%v", added, err)
	}
	added, err = q.Enqueue(ctx, tx, in)
	if err != nil || added {
		t.Fatalf("duplicate added=%v err=%v", added, err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	return jobID
}

func TestClaimLeaseAndRecovery(t *testing.T) {
	q, admin := queues(t)
	ctx := context.Background()
	jobID := enqueue(t, q, admin, "test_only", nil)
	var stored []byte
	if err := admin.QueryRow(ctx, "SELECT payload FROM jobs WHERE id=$1", jobID).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(stored, []byte("private test payload")) {
		t.Fatal("plaintext stored in database")
	}
	claims := make(chan *Job, 2)
	errorsCh := make(chan error, 2)
	for range 2 {
		go func() { j, err := q.Claim(ctx); claims <- j; errorsCh <- err }()
	}
	var first *Job
	count := 0
	for range 2 {
		if j := <-claims; j != nil {
			first = j
			count++
		}
		if err := <-errorsCh; err != nil {
			t.Fatal(err)
		}
	}
	if count != 1 {
		t.Fatalf("claimed %d jobs", count)
	}
	if err := q.Extend(ctx, first); err != nil {
		t.Fatal(err)
	}
	if _, err := admin.Exec(ctx, "UPDATE jobs SET lease_until=now()-interval '1 second' WHERE id=$1", jobID); err != nil {
		t.Fatal(err)
	}
	if err := q.Recover(ctx); err != nil {
		t.Fatal(err)
	}
	second, err := q.Claim(ctx)
	if err != nil || second == nil || second.Attempt != 2 {
		t.Fatalf("reclaim %+v %v", second, err)
	}
	if err = q.Complete(ctx, first); !errors.Is(err, ErrLeaseLost) {
		t.Fatalf("old completion accepted: %v", err)
	}
	if err = q.Extend(ctx, first); !errors.Is(err, ErrLeaseLost) {
		t.Fatalf("old extension accepted: %v", err)
	}
	if err = q.Fail(ctx, second, "transient", false); err != nil {
		t.Fatal(err)
	}
	if j, err := q.Claim(ctx); err != nil || j != nil {
		t.Fatal("retry did not back off")
	}
	if _, err = admin.Exec(ctx, "UPDATE jobs SET available_at=now(),attempts=7 WHERE id=$1", jobID); err != nil {
		t.Fatal(err)
	}
	last, err := q.Claim(ctx)
	if err != nil || last == nil || last.Attempt != 8 {
		t.Fatalf("last attempt %+v %v", last, err)
	}
	if err = q.Fail(ctx, last, "exhausted", false); err != nil {
		t.Fatal(err)
	}
	var state string
	if err = admin.QueryRow(ctx, "SELECT state,payload FROM jobs WHERE id=$1", jobID).Scan(&state, &stored); err != nil {
		t.Fatal(err)
	}
	if state != "dead" || stored != nil {
		t.Fatal("dead job did not redact payload")
	}
}

func TestExpiryRollbackAndSuccess(t *testing.T) {
	q, admin := queues(t)
	ctx := context.Background()
	expires := time.Now().Add(time.Hour)
	jobID := enqueue(t, q, admin, "test_only", &expires)
	_, err := admin.Exec(ctx, "UPDATE jobs SET expires_at=now()-interval '1 second' WHERE id=$1", jobID)
	if err != nil {
		t.Fatal(err)
	}
	if err = q.Recover(ctx); err != nil {
		t.Fatal(err)
	}
	if j, err := q.Claim(ctx); err != nil || j != nil {
		t.Fatal("expired job claimed")
	}
	tx, err := admin.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	_, err = q.Enqueue(ctx, tx, Input{Kind: "test_only", DedupeKey: id.New(), Payload: []byte("rollback")})
	if err != nil {
		t.Fatal(err)
	}
	if err = tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	if j, err := q.Claim(ctx); err != nil || j != nil {
		t.Fatal("rolled back job claimed")
	}
	jobID = enqueue(t, q, admin, "test_only", nil)
	job, err := q.Claim(ctx)
	if err != nil || job == nil {
		t.Fatal(err)
	}
	if err = q.Complete(ctx, job); err != nil {
		t.Fatal(err)
	}
	var state string
	var payload []byte
	if err = admin.QueryRow(ctx, "SELECT state,payload FROM jobs WHERE id=$1", jobID).Scan(&state, &payload); err != nil {
		t.Fatal(err)
	}
	if state != "done" || payload != nil {
		t.Fatal("completed job not redacted")
	}
}

func TestRunnerHeartbeatAndCancellation(t *testing.T) {
	q, admin := queues(t)
	q.Lease = 90 * time.Millisecond
	jobID := enqueue(t, q, admin, "test_only", nil)
	started := make(chan struct{})
	ctx, cancel := context.WithCancel(context.Background())
	runner := Runner{Queue: q, Poll: time.Millisecond, Logger: slog.New(slog.NewTextHandler(io.Discard, nil)), Handlers: map[string]Handler{
		"test_only": func(ctx context.Context, payload []byte) error {
			if string(payload) != "private test payload" {
				return &Failure{Code: "bad_test_payload", Permanent: true}
			}
			close(started)
			<-ctx.Done()
			return ctx.Err()
		},
	}}
	done := make(chan error, 1)
	go func() { done <- runner.Run(ctx) }()
	select {
	case <-started:
	case <-time.After(time.Second):
		cancel()
		t.Fatal("handler not started")
	}
	// More than two lease periods; heartbeats must keep the job owned.
	time.Sleep(220 * time.Millisecond)
	if err := q.Recover(context.Background()); err != nil {
		cancel()
		t.Fatal(err)
	}
	if job, err := q.Claim(context.Background()); err != nil || job != nil {
		cancel()
		t.Fatal("heartbeat lost ownership")
	}
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("worker did not stop")
	}
	var state string
	if err := admin.QueryRow(context.Background(), "SELECT state FROM jobs WHERE id=$1", jobID).Scan(&state); err != nil {
		t.Fatal(err)
	}
	if state != "ready" {
		t.Fatalf("cancelled job state=%s", state)
	}
}

func TestCipherAuthentication(t *testing.T) {
	cipher, err := NewCipher(strings.Repeat("ab", 32))
	if err != nil {
		t.Fatal(err)
	}
	sealed := cipher.Seal("one", "mail", []byte("code"))
	if _, err = cipher.Open("two", "mail", sealed); err == nil {
		t.Fatal("swapped ID accepted")
	}
	if _, err = cipher.Open("one", "photo", sealed); err == nil {
		t.Fatal("swapped kind accepted")
	}
	sealed[len(sealed)-1] ^= 1
	if _, err = cipher.Open("one", "mail", sealed); err == nil {
		t.Fatal("tampered payload accepted")
	}
}
