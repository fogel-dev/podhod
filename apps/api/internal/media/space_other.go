//go:build !linux && !windows

package media

import "errors"

func diskSpace(string) (uint64, uint64, error) {
	return 0, 0, errors.New("media storage supports Linux and Windows")
}
