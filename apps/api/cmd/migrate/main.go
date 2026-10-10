package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/config"
	"github.com/fogel-dev/podhod/apps/api/internal/database"
)

func main() {
	url, err := config.Secret("DATABASE_URL")
	if err == nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		err = database.Migrate(ctx, url)
	}
	if err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}
	slog.Info("migrations applied", "version", database.SchemaVersion())
}
