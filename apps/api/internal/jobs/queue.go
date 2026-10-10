package jobs

import (
	"context"
	"errors"
	"math/rand/v2"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrLeaseLost = errors.New("job lease lost")

type Queue struct {
	Pool        *pgxpool.Pool
	Cipher      *PayloadCipher
	Lease       time.Duration
	MaxAttempts int
}

func New(pool *pgxpool.Pool, cipher *PayloadCipher) *Queue {
	return &Queue{Pool: pool, Cipher: cipher, Lease: 60 * time.Second, MaxAttempts: 8}
}

type Job struct {
	ID         string
	Kind       string
	Payload    []byte
	Attempt    int
	LeaseToken string
	ExpiresAt  *time.Time
}

type Input struct {
	ID          string
	UserID      *string
	Kind        string
	Payload     []byte
	DedupeKey   string
	AvailableAt time.Time
	ExpiresAt   *time.Time
}

// Enqueue participates in the caller's transaction, so jobs cannot outlive rolled-back state.
func (q *Queue) Enqueue(ctx context.Context, tx pgx.Tx, in Input) (bool, error) {
	if in.ID == "" {
		in.ID = id.New()
	}
	if in.Kind == "" || in.DedupeKey == "" {
		return false, errors.New("job kind and dedupe key required")
	}
	if len(in.Payload) > 1<<20 {
		return false, errors.New("job payload too large")
	}
	if in.AvailableAt.IsZero() {
		in.AvailableAt = time.Now().UTC()
	}
	if in.ExpiresAt != nil && !in.ExpiresAt.After(in.AvailableAt) {
		return false, errors.New("job expiration must follow availability")
	}
	payload := q.Cipher.Seal(in.ID, in.Kind, in.Payload)
	result, err := tx.Exec(ctx, `INSERT INTO jobs(id,user_id,kind,payload,dedupe_key,available_at,expires_at)
		VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(dedupe_key) DO NOTHING`, in.ID, in.UserID, in.Kind, payload, in.DedupeKey, in.AvailableAt, in.ExpiresAt)
	return result.RowsAffected() == 1, err
}

func (q *Queue) Recover(ctx context.Context) error {
	_, err := q.Pool.Exec(ctx, `UPDATE jobs SET state = CASE WHEN attempts >= $1 OR expires_at <= now() THEN 'dead' ELSE 'ready' END,
		lease_token=NULL,lease_until=NULL,available_at=now(),updated_at=now(),
		payload=CASE WHEN attempts >= $1 OR expires_at <= now() THEN NULL ELSE payload END,
		last_error_code=CASE WHEN expires_at <= now() THEN 'expired' ELSE 'lease_expired' END
		WHERE state='running' AND lease_until <= now()`, q.MaxAttempts)
	if err != nil {
		return err
	}
	_, err = q.Pool.Exec(ctx, `UPDATE jobs SET state='dead',payload=NULL,
		last_error_code=CASE WHEN expires_at <= now() THEN 'expired' ELSE 'attempts_exhausted' END,updated_at=now()
		WHERE state='ready' AND (expires_at <= now() OR attempts >= $1)`, q.MaxAttempts)
	return err
}

func (q *Queue) Claim(ctx context.Context) (*Job, error) {
	token := id.New()
	job := &Job{LeaseToken: token}
	err := q.Pool.QueryRow(ctx, `WITH picked AS (
		SELECT id FROM jobs WHERE state='ready' AND available_at <= now()
		AND (expires_at IS NULL OR expires_at > now()) AND attempts < $1
		ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1
	) UPDATE jobs SET state='running',attempts=attempts+1,lease_token=$2,
		lease_until=LEAST(now()+$3::bigint*interval '1 millisecond',expires_at),updated_at=now()
		FROM picked WHERE jobs.id=picked.id
		RETURNING jobs.id::text,kind,payload,attempts,expires_at`, q.MaxAttempts, token, q.Lease.Milliseconds()).Scan(&job.ID, &job.Kind, &job.Payload, &job.Attempt, &job.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (q *Queue) Extend(ctx context.Context, job *Job) error {
	result, err := q.Pool.Exec(ctx, `UPDATE jobs SET lease_until=LEAST(now()+$3::bigint*interval '1 millisecond',expires_at),updated_at=now()
		WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now()`, job.ID, job.LeaseToken, q.Lease.Milliseconds())
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return ErrLeaseLost
	}
	return nil
}

func (q *Queue) Complete(ctx context.Context, job *Job) error {
	result, err := q.Pool.Exec(ctx, `UPDATE jobs SET state='done',payload=NULL,lease_token=NULL,lease_until=NULL,last_error_code=NULL,updated_at=now()
		WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now()`, job.ID, job.LeaseToken)
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return ErrLeaseLost
	}
	return nil
}

func backoff(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}
	if attempt > 8 {
		attempt = 8
	}
	base := time.Second * time.Duration(1<<(attempt-1))
	return base + time.Duration(rand.Int64N(int64(base/2)+1))
}

func (q *Queue) Fail(ctx context.Context, job *Job, code string, permanent bool) error {
	state := "ready"
	if permanent || job.Attempt >= q.MaxAttempts {
		state = "dead"
	}
	result, err := q.Pool.Exec(ctx, `UPDATE jobs SET state=$3,last_error_code=$4,
		available_at=now()+$5::bigint*interval '1 millisecond',payload=CASE WHEN $3='dead' THEN NULL ELSE payload END,
		lease_until=NULL,lease_token=NULL,updated_at=now()
		WHERE id=$1 AND lease_token=$2 AND state='running' AND lease_until>now()`, job.ID, job.LeaseToken, state, code, backoff(job.Attempt).Milliseconds())
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return ErrLeaseLost
	}
	return nil
}
