package database

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
)

// A fresh real database per test; no test fixtures enter the application.
func testDatabase(t *testing.T) string {
	t.Helper()
	connectionURL := os.Getenv("TEST_DATABASE_URL")
	if connectionURL == "" {
		t.Skip("TEST_DATABASE_URL required for PostgreSQL integration tests")
	}
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	var suffix [8]byte
	_, _ = rand.Read(suffix[:])
	name := fmt.Sprintf("podhod_test_%x", suffix[:])
	if _, err = admin.Exec(ctx, "CREATE DATABASE "+pgx.Identifier{name}.Sanitize()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, err := admin.Exec(ctx, "DROP DATABASE "+pgx.Identifier{name}.Sanitize()+" WITH (FORCE)")
		if err != nil {
			t.Error(err)
		}
		_ = admin.Close(ctx)
	})
	cfg, err := pgx.ParseConfig(connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	cfg.Database = name
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	bootstrap, err := os.ReadFile("../../db/bootstrap.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = conn.Exec(ctx, string(bootstrap)); err != nil {
		t.Fatal(err)
	}
	_ = conn.Close(ctx)
	parsed, err := url.Parse(connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	parsed.Path = "/" + name
	return parsed.String()
}

func TestMigrationsAndPermissions(t *testing.T) {
	url := testDatabase(t)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	// Concurrent migrators serialize through a session advisory lock.
	results := make(chan error, 2)
	for range 2 {
		go func() { results <- Migrate(ctx, url) }()
	}
	for range 2 {
		if err := <-results; err != nil {
			t.Fatal(err)
		}
	}
	pool, err := Open(ctx, url, 2)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if err = Ready(pool)(ctx); err != nil {
		t.Fatal(err)
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	var count int
	if err = conn.QueryRow(ctx, "SELECT count(*) FROM schema_migrations").Scan(&count); err != nil || count != SchemaVersion() {
		t.Fatalf("migrations count=%d err=%v", count, err)
	}
	_, err = conn.Exec(ctx, `SET ROLE podhod_api;
		INSERT INTO users(id,email_normalized) VALUES('00000000-0000-4000-8000-000000000001','one@test.invalid'),('00000000-0000-4000-8000-000000000002','two@test.invalid');
		INSERT INTO devices(id,user_id,label) VALUES('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','test')`)
	if err != nil {
		t.Fatal(err)
	}
	_, err = conn.Exec(ctx, `INSERT INTO sessions(id,user_id,device_id,token_hash,csrf_hash,expires_at)
		VALUES('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','a','b',now()+interval '1 day')`)
	if err == nil {
		t.Fatal("cross-owner foreign key accepted")
	}
	if _, err = conn.Exec(ctx, "CREATE TABLE forbidden(id int)"); err == nil {
		t.Fatal("runtime role can create tables")
	}
	if _, err = conn.Exec(ctx, "DELETE FROM users"); err == nil {
		t.Fatal("runtime role can delete accounts")
	}
	if _, err = conn.Exec(ctx, "UPDATE schema_migrations SET checksum = 'changed'"); err == nil {
		t.Fatal("runtime role can edit migration history")
	}
	_, err = conn.Exec(ctx, "RESET ROLE; SET ROLE podhod_worker")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = conn.Exec(ctx, "SELECT email_normalized FROM users"); err == nil {
		t.Fatal("worker can read private users without need")
	}
	if _, err = conn.Exec(ctx, "RESET ROLE"); err != nil {
		t.Fatal(err)
	}
	// A fresh connection sees persisted writes.
	other, err := pgx.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer other.Close(ctx)
	if err = other.QueryRow(ctx, "SELECT count(*) FROM podhod.users").Scan(&count); err != nil || count != 2 {
		t.Fatalf("persisted users=%d err=%v", count, err)
	}
	_, err = other.Exec(ctx, "UPDATE podhod.schema_migrations SET checksum='tampered'")
	if err != nil {
		t.Fatal(err)
	}
	if err = Migrate(ctx, url); err == nil {
		t.Fatal("modified migration checksum accepted")
	}
}

func TestReadinessNeedsMigratedDatabase(t *testing.T) {
	url := testDatabase(t)
	pool, err := Open(context.Background(), url, 1)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	if Ready(pool)(context.Background()) == nil {
		t.Fatal("unmigrated database is ready")
	}
	if Ready(nil)(context.Background()) == nil {
		t.Fatal("missing database is ready")
	}
}
