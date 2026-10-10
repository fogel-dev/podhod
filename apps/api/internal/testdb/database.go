// Package testdb supports isolated real PostgreSQL tests; it is not imported by application binaries.
package testdb

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/url"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
)

func New(t testing.TB) string {
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
	// Roles are cluster-wide; serialize bootstrap across test packages on the admin database.
	if _, err = admin.Exec(ctx, "SELECT pg_advisory_lock(724018490)"); err != nil {
		t.Fatal(err)
	}
	defer admin.Exec(context.Background(), "SELECT pg_advisory_unlock(724018490)")
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
	parsed, err := url.Parse(connectionURL)
	if err != nil {
		t.Fatal(err)
	}
	parsed.Path = "/" + name
	conn, err := pgx.Connect(ctx, parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	bootstrap, err := os.ReadFile("../../db/bootstrap.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = conn.Exec(ctx, string(bootstrap)); err != nil {
		t.Fatal(err)
	}
	return parsed.String()
}
