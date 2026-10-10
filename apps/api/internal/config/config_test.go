package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestFileSecrets(t *testing.T) {
	path := filepath.Join(t.TempDir(), "secret")
	if err := os.WriteFile(path, []byte("  test-value\n"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("TEST_SECRET", "")
	t.Setenv("TEST_SECRET_FILE", path)
	got, err := Secret("TEST_SECRET")
	if err != nil || got != "test-value" {
		t.Fatalf("got=%q err=%v", got, err)
	}
	t.Setenv("TEST_SECRET", "sensitive-value")
	_, err = Secret("TEST_SECRET")
	if err == nil || strings.Contains(err.Error(), "sensitive-value") {
		t.Fatal("conflicting secrets must fail without leaking values")
	}
}
