package httpserver_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/fogel-dev/podhod/apps/api/internal/httpserver"
)

func TestServerHTTPAndShutdown(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := httpserver.New(listener.Addr().String(), slog.New(slog.NewTextHandler(io.Discard, nil)))
	t.Cleanup(func() { _ = server.Close() })
	done := make(chan error, 1)
	go func() { done <- server.Serve(listener) }()
	client := &http.Client{Timeout: 3 * time.Second}
	base := "http://" + listener.Addr().String()
	response, err := client.Get(base + "/api/health")
	if err != nil {
		t.Fatal(err)
	}
	body, err := io.ReadAll(response.Body)
	response.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	if response.StatusCode != http.StatusOK || string(body) != "{\"status\":\"ok\"}\n" {
		t.Fatalf("unexpected health response: %d %s", response.StatusCode, body)
	}
	if response.Header.Get("Cache-Control") != "no-store" {
		t.Fatal("health response must not be cached")
	}
	response, err = client.Get(base + "/api/workouts")
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode != http.StatusNotFound {
		t.Fatal("unimplemented route must return 404")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		t.Fatal(err)
	}
	if err := <-done; !errors.Is(err, http.ErrServerClosed) {
		t.Fatalf("shutdown: %v", err)
	}
	if response, err := client.Get(base + "/api/health"); err == nil {
		response.Body.Close()
		t.Fatal("server still accepts requests after shutdown")
	}
}

func TestReadiness(t *testing.T) {
	for _, ready := range []bool{false, true} {
		server := httpserver.New("", slog.Default(), func(ctx context.Context) error {
			if !ready {
				return errors.New("private DB detail")
			}
			return nil
		})
		response := httptest.NewRecorder()
		server.Handler.ServeHTTP(response, httptest.NewRequest("GET", "/api/ready", nil))
		want := 503
		if ready {
			want = 200
		}
		if response.Code != want {
			t.Fatalf("status=%d want=%d", response.Code, want)
		}
		if response.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("readiness cache")
		}
		if strings.Contains(response.Body.String(), "private DB detail") {
			t.Fatal("DB details leaked")
		}
	}
}
