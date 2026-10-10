//go:build windows

package media

import "golang.org/x/sys/windows"

func diskSpace(path string) (uint64, uint64, error) {
	p, e := windows.UTF16PtrFromString(path)
	if e != nil {
		return 0, 0, e
	}
	var free, total uint64
	e = windows.GetDiskFreeSpaceEx(p, &free, &total, nil)
	return free, total, e
}
