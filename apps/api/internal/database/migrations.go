package database

import (
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

const migrationLock int64 = 724018491

func Migrate(ctx context.Context, url string) error {
	if url == "" {
		return errors.New("DATABASE_URL is required")
	}
	conn, err := pgx.Connect(ctx, url)
	if err != nil {
		return errors.New("connect migration database failed")
	}
	defer conn.Close(context.Background())
	if _, err = conn.Exec(ctx, "SELECT pg_advisory_lock($1)", migrationLock); err != nil {
		return err
	}
	defer conn.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", migrationLock)
	if _, err = conn.Exec(ctx, "SET ROLE podhod_migrator; SET search_path TO podhod, pg_catalog"); err != nil {
		return fmt.Errorf("migration role: %w", err)
	}
	if _, err = conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version integer PRIMARY KEY, name text NOT NULL, checksum text NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`); err != nil {
		return err
	}
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, entry := range entries {
		name := entry.Name()
		v, err := strconv.Atoi(strings.SplitN(name, "_", 2)[0])
		if err != nil {
			return fmt.Errorf("invalid migration name %s", name)
		}
		body, err := migrationFiles.ReadFile("migrations/" + name)
		if err != nil {
			return err
		}
		hash := sha256.Sum256(body)
		checksum := hex.EncodeToString(hash[:])
		var stored string
		err = conn.QueryRow(ctx, "SELECT checksum FROM schema_migrations WHERE version = $1", v).Scan(&stored)
		if err == nil {
			if stored != checksum {
				return fmt.Errorf("migration %s checksum mismatch", name)
			}
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		tx, err := conn.Begin(ctx)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, string(body))
		if err == nil {
			_, err = tx.Exec(ctx, "INSERT INTO schema_migrations(version,name,checksum) VALUES($1,$2,$3)", v, name, checksum)
		}
		if err != nil {
			_ = tx.Rollback(context.Background())
			return fmt.Errorf("migration %s: %w", name, err)
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
	}
	return nil
}

func SchemaVersion() int {
	entries, _ := migrationFiles.ReadDir("migrations")
	max := 0
	for _, entry := range entries {
		v, _ := strconv.Atoi(strings.SplitN(entry.Name(), "_", 2)[0])
		if v > max {
			max = v
		}
	}
	return max
}
