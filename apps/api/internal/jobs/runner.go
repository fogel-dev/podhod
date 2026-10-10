package jobs

import (
	"context"
	"errors"
	"log/slog"
	"time"
)

type Handler func(context.Context, []byte) error

type Failure struct {
	Code      string
	Permanent bool
}

func (f *Failure) Error() string { return f.Code }

type Runner struct {
	Queue    *Queue
	Handlers map[string]Handler
	Logger   *slog.Logger
	Poll     time.Duration
}

func (r *Runner) Run(ctx context.Context) error {
	if r.Poll <= 0 {
		r.Poll = time.Second
	}
	for {
		if ctx.Err() != nil {
			return nil
		}
		if err := r.Queue.Recover(ctx); err != nil {
			if ctx.Err() != nil {
				return nil
			}
			r.Logger.Error("job recovery failed")
		} else {
			job, err := r.Queue.Claim(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return nil
				}
				r.Logger.Error("job claim failed")
			}
			if job != nil {
				r.process(ctx, job)
				continue
			}
		}
		timer := time.NewTimer(r.Poll)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil
		case <-timer.C:
		}
	}
}

func (r *Runner) process(parent context.Context, job *Job) {
	deadline := time.Now().Add(5 * time.Minute)
	if job.ExpiresAt != nil && job.ExpiresAt.Before(deadline) {
		deadline = *job.ExpiresAt
	}
	ctx, cancel := context.WithDeadline(parent, deadline)
	defer cancel()
	stopHeartbeat := make(chan struct{})
	heartbeatDone := make(chan struct{})
	go func() {
		defer close(heartbeatDone)
		ticker := time.NewTicker(r.Queue.Lease / 3)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-stopHeartbeat:
				return
			case <-ticker.C:
				if err := r.Queue.Extend(ctx, job); err != nil {
					cancel()
					return
				}
			}
		}
	}()
	var failure error
	plaintext, err := r.Queue.Cipher.Open(job.ID, job.Kind, job.Payload)
	if err != nil {
		failure = &Failure{Code: "invalid_payload", Permanent: true}
	} else if handler, ok := r.Handlers[job.Kind]; !ok {
		failure = &Failure{Code: "unsupported_kind", Permanent: true}
	} else {
		failure = invoke(ctx, handler, plaintext)
	}
	clear(plaintext)
	close(stopHeartbeat)
	<-heartbeatDone
	// Shutdown cancels work; make the lease reclaimable instead of waiting for its expiry.
	finishCtx, finishCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer finishCancel()
	if failure == nil && ctx.Err() == nil {
		if err = r.Queue.Complete(finishCtx, job); err != nil {
			r.Logger.Warn("job completion not recorded", "kind", job.Kind)
		}
		return
	}
	code, permanent := "handler_failed", false
	var typed *Failure
	if errors.As(failure, &typed) {
		code, permanent = typed.Code, typed.Permanent
	}
	if ctx.Err() != nil {
		code, permanent = "interrupted", false
	}
	if err = r.Queue.Fail(finishCtx, job, code, permanent); err != nil {
		r.Logger.Warn("job failure not recorded", "kind", job.Kind)
	}
	if permanent || job.Attempt >= r.Queue.MaxAttempts {
		r.Logger.Error("job dead", "kind", job.Kind, "code", code)
	}
}

func invoke(ctx context.Context, handler Handler, payload []byte) (err error) {
	defer func() {
		if recover() != nil {
			err = &Failure{Code: "handler_panic", Permanent: false}
		}
	}()
	return handler(ctx, payload)
}
