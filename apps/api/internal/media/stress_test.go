package media

import (
	"bytes"
	"compress/zlib"
	"encoding/binary"
	"hash/crc32"
	"os"
	"runtime"
	"sync/atomic"
	"testing"
	"time"
)

// Opt-in acceptance probe: a highly compressed, 30 MP, 16-bit RGBA PNG.
// Generating rows incrementally avoids counting a second decoded fixture as worker memory.
func TestLargest16BitPNG(t *testing.T) {
	if os.Getenv("MEDIA_STRESS") != "1" {
		t.Skip("set MEDIA_STRESS=1 for the maximum-image memory probe")
	}
	var data bytes.Buffer
	data.WriteString("\x89PNG\r\n\x1a\n")
	chunk := func(kind string, b []byte) {
		_ = binary.Write(&data, binary.BigEndian, uint32(len(b)))
		data.WriteString(kind)
		data.Write(b)
		_ = binary.Write(&data, binary.BigEndian, crc32.ChecksumIEEE(append([]byte(kind), b...)))
	}
	header := make([]byte, 13)
	binary.BigEndian.PutUint32(header[:4], 5000)
	binary.BigEndian.PutUint32(header[4:8], 6000)
	header[8], header[9] = 16, 6
	chunk("IHDR", header)
	var compressed bytes.Buffer
	z := zlib.NewWriter(&compressed)
	row := make([]byte, 1+5000*8)
	for i := 1; i < len(row); i += 8 {
		row[i+6], row[i+7] = 255, 255
	}
	for range 6000 {
		if _, e := z.Write(row); e != nil {
			t.Fatal(e)
		}
	}
	if e := z.Close(); e != nil {
		t.Fatal(e)
	}
	chunk("IDAT", compressed.Bytes())
	chunk("IEND", nil)
	runtime.GC()
	var peak atomic.Uint64
	done := make(chan struct{})
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		for {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			for old := peak.Load(); m.HeapAlloc > old && !peak.CompareAndSwap(old, m.HeapAlloc); old = peak.Load() {
			}
			select {
			case <-done:
				return
			case <-time.After(5 * time.Millisecond):
			}
		}
	}()
	start := time.Now()
	_, _, w, h, e := processImage(data.Bytes(), "image/png")
	close(done)
	<-stopped
	if e != nil {
		t.Fatal(e)
	}
	if max(w, h) != 2048 {
		t.Fatal(w, h)
	}
	t.Logf("30MP RGBA16: compressed=%d bytes, sampled Go heap=%.1f MiB, elapsed=%s", data.Len(), float64(peak.Load())/(1<<20), time.Since(start))
}
