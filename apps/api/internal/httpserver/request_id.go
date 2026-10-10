package httpserver

import "github.com/fogel-dev/podhod/apps/api/internal/id"

func requestID() string {
	return id.New()
}
