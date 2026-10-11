package media

import (
	"os"
	"strings"
	"testing"
)

func TestNewDiskChecksWritableDirectory(t *testing.T) {
	dir := t.TempDir()
	disk, err := NewDisk(dir)
	if err != nil {
		t.Fatal(err)
	}
	disk.Root.Close()
	files, err := os.ReadDir(dir)
	if err != nil || len(files) != 0 {
		t.Fatal("probe left files", files, err)
	}
}

func TestNewDiskRejectsReadOnlyDirectory(t *testing.T) {
	if os.Geteuid() == 0 {
		t.Skip("run as a non-root application user to enforce permissions")
	}
	dir := t.TempDir()
	if err := os.Chmod(dir, 0500); err != nil {
		t.Fatal(err)
	}
	defer os.Chmod(dir, 0700)
	disk, err := NewDisk(dir)
	if disk != nil {
		disk.Root.Close()
		t.Fatal("accepted a read-only media directory")
	}
	if err == nil || !strings.Contains(err.Error(), "MEDIA_DIR must be writable") {
		t.Fatal(err)
	}
}
