//go:build linux

package media

import "golang.org/x/sys/unix"

func diskSpace(path string) (uint64, uint64, error) {
	var s unix.Statfs_t
	e := unix.Statfs(path, &s)
	return s.Bavail * uint64(s.Bsize), s.Blocks * uint64(s.Bsize), e
}
