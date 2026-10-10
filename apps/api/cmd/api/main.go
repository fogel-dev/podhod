package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"encoding/hex"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/config"
	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/exercises"
	"github.com/fogel-dev/podhod/apps/api/internal/httpserver"
	"github.com/fogel-dev/podhod/apps/api/internal/httpx"
	"github.com/fogel-dev/podhod/apps/api/internal/jobs"
	"github.com/fogel-dev/podhod/apps/api/internal/journal"
	"github.com/fogel-dev/podhod/apps/api/internal/media"
	"github.com/fogel-dev/podhod/apps/api/internal/programs"
	"github.com/fogel-dev/podhod/apps/api/internal/workouts"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("API stopped", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	pool, err := database.Open(ctx, cfg.DatabaseURL, 10)
	if err != nil {
		return err
	}
	defer pool.Close()
	key, err := config.Secret("AUTH_HMAC_KEY")
	if err != nil {
		return err
	}
	access, err := auth.New(pool, key, os.Getenv("PUBLIC_ORIGIN"), os.Getenv("AUTH_INSECURE_LOCAL") == "1", os.Getenv("TRUSTED_PROXY_CIDRS"))
	if err != nil {
		return err
	}
	disk, err := media.NewDisk(os.Getenv("MEDIA_DIR"))
	if err != nil {
		return err
	}
	defer disk.Root.Close()
	jobKey, err := config.Secret("JOB_ENCRYPTION_KEY")
	if err != nil {
		return err
	}
	cipher, err := jobs.NewCipher(jobKey)
	if err != nil {
		return err
	}
	listener, err := net.Listen("tcp", cfg.HTTPAddr)
	if err != nil {
		return err
	}
	server := httpserver.New(cfg.HTTPAddr, logger, database.Ready(pool))
	access.RegisterRoutes(server.Handler.(*http.ServeMux))
	core := httpx.New(pool, key)
	(&exercises.Service{Core: core, Auth: access}).RegisterRoutes(server.Handler.(*http.ServeMux))
	(&programs.Service{Core: core, Auth: access}).RegisterRoutes(server.Handler.(*http.ServeMux))
	(&workouts.Service{Core: core, Auth: access}).RegisterRoutes(server.Handler.(*http.ServeMux))
	(&journal.Service{Core: core, Auth: access}).RegisterRoutes(server.Handler.(*http.ServeMux))
	mediaKey, _ := hex.DecodeString(key)
	(&media.Service{Core: core, Auth: access, Store: disk, Queue: jobs.New(pool, cipher), Key: mediaKey}).RegisterRoutes(server.Handler.(*http.ServeMux))
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	logger.Info("API listening", "address", listener.Addr().String())
	select {
	case err := <-done:
		return err
	case <-ctx.Done():
		stop()
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		_ = server.Close()
		return err
	}
	if err := <-done; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	logger.Info("API stopped gracefully")
	return nil
}
