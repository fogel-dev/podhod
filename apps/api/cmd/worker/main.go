package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/config"
	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/jobs"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("worker stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	url, err := config.Secret("DATABASE_URL")
	if err != nil {
		return err
	}
	key, err := config.Secret("JOB_ENCRYPTION_KEY")
	if err != nil {
		return err
	}
	cipher, err := jobs.NewCipher(key)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	pool, err := database.Open(ctx, url, 4)
	if err != nil {
		return err
	}
	defer pool.Close()
	readyCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	err = database.Ready(pool)(readyCtx)
	cancel()
	if err != nil {
		return errors.New("worker database is not ready")
	}
	runner := jobs.Runner{Queue: jobs.New(pool, cipher), Handlers: map[string]jobs.Handler{}, Logger: logger}
	logger.Info("worker started")
	err = runner.Run(ctx)
	logger.Info("worker stopped")
	return err
}
