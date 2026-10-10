package database

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Open(ctx context.Context, url string, maxConns int32) (*pgxpool.Pool, error) {
	if url == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, errors.New("invalid DATABASE_URL")
	}
	cfg.MaxConns = maxConns
	cfg.MinConns = 0
	cfg.ConnConfig.ConnectTimeout = 3 * time.Second
	cfg.ConnConfig.RuntimeParams["search_path"] = "podhod,pg_catalog"
	cfg.ConnConfig.RuntimeParams["statement_timeout"] = "10000"
	return pgxpool.NewWithConfig(ctx, cfg)
}

func Ready(pool *pgxpool.Pool) func(context.Context) error {
	return func(ctx context.Context) error {
		if pool == nil {
			return errors.New("database is not configured")
		}
		var v int
		if err := pool.QueryRow(ctx, "SELECT COALESCE(max(version),0) FROM schema_migrations").Scan(&v); err != nil {
			return errors.New("database unavailable")
		}
		if v < SchemaVersion() {
			return errors.New("database schema is outdated")
		}
		// Additive newer schema remains compatible with this binary for rolling releases.
		return nil
	}
}
