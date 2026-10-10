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
	"github.com/fogel-dev/podhod/apps/api/internal/media"
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
	disk, err := media.NewDisk(os.Getenv("MEDIA_DIR"))
	if err != nil {
		return err
	}
	defer disk.Root.Close()
	photos := &media.Worker{Pool: pool, Store: disk}
	maintenanceDone := make(chan struct{})
	go func() {
		defer close(maintenanceDone)
		for {
			maintenanceCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			if e := photos.Maintain(maintenanceCtx); e != nil && ctx.Err() == nil {
				logger.Error("photo maintenance failed")
			}
			cancel()
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Minute):
			}
		}
	}()
	defer func() { stop(); <-maintenanceDone }()
	runner := jobs.Runner{Queue: jobs.New(pool, cipher), Handlers: photos.Handlers(), Logger: logger}
	logger.Info("worker started")
	err = runner.Run(ctx)
	logger.Info("worker stopped")
	return err
}
