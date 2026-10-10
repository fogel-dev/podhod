package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"github.com/fogel-dev/podhod/apps/api/internal/auth"
	"github.com/fogel-dev/podhod/apps/api/internal/database"
	"github.com/fogel-dev/podhod/apps/api/internal/domaintest"
	"github.com/fogel-dev/podhod/apps/api/internal/id"
	"github.com/fogel-dev/podhod/apps/api/internal/jobs"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"
)

func fixture(t *testing.T) (*domaintest.App, domaintest.Client, *Service, *Worker) {
	t.Helper()
	a := domaintest.New(t)
	c := a.User(t, "photos")
	d, e := NewDisk(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(func() { d.Root.Close() })
	cipher, e := jobs.NewCipher(strings.Repeat("ab", 32))
	if e != nil {
		t.Fatal(e)
	}
	s := &Service{Core: a.Core, Auth: a.Auth, Store: d, Queue: jobs.New(a.Core.Pool, cipher), Key: bytes.Repeat([]byte{0xcd}, 32)}
	s.RegisterRoutes(a.Mux)
	p, e := database.Open(context.Background(), a.URL+"&role=podhod_worker", 3)
	if e != nil {
		t.Fatal(e)
	}
	t.Cleanup(p.Close)
	return a, c, s, &Worker{Pool: p, Store: d}
}
func jpegData(t *testing.T) []byte {
	t.Helper()
	i := image.NewRGBA(image.Rect(0, 0, 40, 20))
	for y := 0; y < 20; y++ {
		for x := 0; x < 40; x++ {
			i.Set(x, y, color.RGBA{R: uint8(x * 6), G: uint8(y * 10), B: 50, A: 255})
		}
	}
	var b bytes.Buffer
	if e := jpeg.Encode(&b, i, nil); e != nil {
		t.Fatal(e)
	}
	return b.Bytes()
}
func reservePhoto(t *testing.T, a *domaintest.App, c domaintest.Client, data []byte, date string) Upload {
	t.Helper()
	hash := sha256.Sum256(data)
	in := map[string]any{"id": id.New(), "localDate": date, "mimeType": "image/jpeg", "sizeBytes": len(data), "checksumSha256": hex.EncodeToString(hash[:])}
	w := a.Write(c, "POST", "/api/v1/photos/uploads", in, 0)
	domaintest.Status(t, w, 201)
	var u Upload
	domaintest.Decode(t, w, &u)
	return u
}
func put(a *domaintest.App, c domaintest.Client, u Upload, data []byte) *httptest.ResponseRecorder {
	r := httptest.NewRequest("PUT", u.URL, bytes.NewReader(data))
	r.AddCookie(c.Cookie)
	r.Header.Set("Origin", a.Auth.Origin)
	for k, v := range u.Headers {
		r.Header.Set(k, v)
	}
	r.Header.Set("X-CSRF-Token", c.Session.CSRFToken)
	w := httptest.NewRecorder()
	a.Mux.ServeHTTP(w, r)
	return w
}
func completePhoto(t *testing.T, a *domaintest.App, c domaintest.Client, u Upload, data []byte) Photo {
	t.Helper()
	hash := sha256.Sum256(data)
	w := a.Write(c, "POST", "/api/v1/photos/"+u.PhotoID+"/complete", Complete{u.Version, hex.EncodeToString(hash[:])}, 0)
	domaintest.Status(t, w, 202)
	var p Photo
	domaintest.Decode(t, w, &p)
	return p
}
func processNext(t *testing.T, s *Service, w *Worker) {
	t.Helper()
	q := jobs.New(w.Pool, s.Queue.Cipher)
	j, e := q.Claim(context.Background())
	if e != nil || j == nil {
		t.Fatal("claim", j, e)
	}
	b, e := q.Cipher.Open(j.ID, j.Kind, j.Payload)
	if e != nil {
		t.Fatal(e)
	}
	handler := w.Handlers()[j.Kind]
	if handler == nil {
		t.Fatal(j.Kind)
	}
	if e = handler(context.Background(), b); e != nil {
		t.Fatal(e)
	}
	if e = q.Complete(context.Background(), j); e != nil {
		t.Fatal(e)
	}
}
func TestPrivatePhotoPipelineAndDeletion(t *testing.T) {
	a, c, s, worker := fixture(t)
	other := a.User(t, "otherphoto")
	data := jpegData(t)
	// APP1 carries real orientation and a GPS-like private marker; no metadata survives re-encoding.
	exif := []byte{'E', 'x', 'i', 'f', 0, 0, 'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0}
	exif = append(exif, []byte("GPS private marker")...)
	n := len(exif) + 2
	data = append(append(append([]byte{}, data[:2]...), 255, 225, byte(n>>8), byte(n)), append(exif, data[2:]...)...)
	u := reservePhoto(t, a, c, data, "2026-10-10")
	domaintest.Status(t, put(a, c, u, data), 204)
	domaintest.Status(t, put(a, other, u, data), 404)
	p := completePhoto(t, a, c, u, data)
	if p.Status != "processing" {
		t.Fatal(p)
	}
	domaintest.Status(t, put(a, c, u, data), 403)
	processNext(t, s, worker)
	r := a.Request(c, "GET", "/api/v1/photos/"+u.PhotoID, nil, "", "")
	domaintest.Status(t, r, 200)
	domaintest.Decode(t, r, &p)
	if p.Status != "ready" || *p.Width != 20 || *p.Height != 40 {
		t.Fatal(p)
	}
	domaintest.Status(t, a.Request(other, "GET", "/api/v1/photos/"+p.ID, nil, "", ""), 404)
	r = a.Request(c, "POST", "/api/v1/photos/read-urls", map[string]any{"photoIds": []string{p.ID}, "variant": "image"}, "", "")
	domaintest.Status(t, r, 200)
	var result struct {
		Items []struct {
			URL string `json:"url"`
		}
	}
	domaintest.Decode(t, r, &result)
	parsed, e := url.Parse(result.Items[0].URL)
	if e != nil {
		t.Fatal(e)
	}
	path := parsed.RequestURI()
	r = a.Request(c, "GET", path, nil, "", "")
	domaintest.Status(t, r, 200)
	if bytes.Contains(r.Body.Bytes(), []byte("GPS")) || bytes.Contains(r.Body.Bytes(), []byte("Exif")) {
		t.Fatal("metadata leaked")
	}
	if r.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("private bytes cacheable")
	}
	domaintest.Status(t, a.Request(other, "GET", path, nil, "", ""), 404)
	domaintest.Status(t, a.Request(c, "GET", path+"x", nil, "", ""), 403)
	page, e := Day(context.Background(), a.Core.Pool, c.Session.User.ID, "2026-10-10")
	if e != nil || len(page.Items) != 1 || page.Items[0].ID != p.ID {
		t.Fatal("day missing ready photo", page, e)
	}
	domaintest.Status(t, a.Write(c, "DELETE", "/api/v1/photos/"+p.ID, nil, p.Version), 204)
	domaintest.Status(t, a.Request(c, "GET", path, nil, "", ""), 404)
	admin, e := database.Open(context.Background(), a.URL, 1)
	if e != nil {
		t.Fatal(e)
	}
	defer admin.Close()
	if _, e = admin.Exec(context.Background(), `UPDATE photos SET deleted_at=now()-interval '8 days' WHERE id=$1`, p.ID); e != nil {
		t.Fatal(e)
	}
	if e = worker.Maintain(context.Background()); e != nil {
		t.Fatal(e)
	}
	var stored int64
	if e = admin.QueryRow(context.Background(), `SELECT stored_bytes FROM photos WHERE id=$1`, p.ID).Scan(&stored); e != nil || stored != 0 {
		t.Fatal(stored, e)
	}
}
func TestPhotoInvalidBytesExpiryRenewAndParallelQuota(t *testing.T) {
	a, c, s, w := fixture(t)
	ctx := context.Background()
	data := []byte("not a JPEG")
	u := reservePhoto(t, a, c, data, "2026-10-11")
	domaintest.Status(t, put(a, c, u, data), 204)
	completePhoto(t, a, c, u, data)
	processNext(t, s, w)
	r := a.Request(c, "GET", "/api/v1/photos/"+u.PhotoID, nil, "", "")
	var p Photo
	domaintest.Decode(t, r, &p)
	if p.Status != "failed" || p.ErrorCode == nil {
		t.Fatal(p)
	}
	hash := sha256.Sum256(data)
	r = a.Write(c, "POST", "/api/v1/photos/"+u.PhotoID+"/upload-url", Complete{p.Version, hex.EncodeToString(hash[:])}, 0)
	domaintest.Status(t, r, 200)
	var renewed Upload
	domaintest.Decode(t, r, &renewed)
	domaintest.Status(t, put(a, c, u, data), 403)
	domaintest.Status(t, put(a, c, renewed, data), 204)
	admin, e := database.Open(ctx, a.URL, 1)
	if e != nil {
		t.Fatal(e)
	}
	defer admin.Close()
	if _, e = admin.Exec(ctx, `UPDATE photos SET upload_expires_at=now()-interval '1 minute' WHERE id=$1`, u.PhotoID); e != nil {
		t.Fatal(e)
	}
	if e = w.Maintain(ctx); e != nil {
		t.Fatal(e)
	}
	r = a.Request(c, "GET", "/api/v1/photos/"+u.PhotoID, nil, "", "")
	domaintest.Decode(t, r, &p)
	if p.Status != "failed" || *p.ErrorCode != "upload_expired" {
		t.Fatal(p)
	}
	good := jpegData(t)
	hash = sha256.Sum256(good)
	var mu sync.Mutex
	ok, conflicts := 0, 0
	var wg sync.WaitGroup
	for range 22 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := a.Write(c, "POST", "/api/v1/photos/uploads", map[string]any{"id": id.New(), "localDate": "2026-10-12", "mimeType": "image/jpeg", "sizeBytes": len(good), "checksumSha256": hex.EncodeToString(hash[:])}, 0)
			mu.Lock()
			defer mu.Unlock()
			switch r.Code {
			case 201:
				ok++
			case 409:
				conflicts++
			default:
				t.Errorf("reserve: %d %s", r.Code, r.Body.String())
			}
		}()
	}
	wg.Wait()
	if ok != 20 || conflicts != 2 {
		t.Fatal(ok, conflicts)
	}
	if _, e = admin.Exec(ctx, `UPDATE photos SET status='failed',stored_bytes=1073741824 WHERE id=$1`, u.PhotoID); e != nil {
		t.Fatal(e)
	}
	r = a.Write(c, "POST", "/api/v1/photos/uploads", map[string]any{"id": id.New(), "localDate": "2026-10-13", "mimeType": "image/jpeg", "sizeBytes": len(good), "checksumSha256": hex.EncodeToString(hash[:])}, 0)
	domaintest.Status(t, r, 409)
}
func TestImageLimitsOrientationAndDiskTraversal(t *testing.T) {
	data := jpegData(t)
	var huge bytes.Buffer
	huge.WriteString("\x89PNG\r\n\x1a\n")
	header := make([]byte, 13)
	binary.BigEndian.PutUint32(header[:4], 30000)
	binary.BigEndian.PutUint32(header[4:8], 30000)
	header[8], header[9] = 8, 6
	_ = binary.Write(&huge, binary.BigEndian, uint32(13))
	huge.WriteString("IHDR")
	huge.Write(header)
	_ = binary.Write(&huge, binary.BigEndian, crc32.ChecksumIEEE(append([]byte("IHDR"), header...)))
	if _, _, _, _, e := processImage(huge.Bytes(), "image/png"); e == nil {
		t.Fatal("pixel limit bypassed")
	}
	if _, _, _, _, e := processImage(data, "image/png"); e == nil {
		t.Fatal("MIME mismatch accepted")
	}
	if _, _, _, _, e := processImage([]byte("broken"), "image/jpeg"); e == nil {
		t.Fatal("broken image accepted")
	}
	src := image.NewRGBA(image.Rect(0, 0, 3, 2))
	src.SetRGBA(0, 0, color.RGBA{R: 255, A: 255})
	for n := 1; n <= 8; n++ {
		i := orient(src, n)
		if n >= 5 && i.Bounds().Dx() != 2 {
			t.Fatal(n)
		}
	}
	d, e := NewDisk(t.TempDir())
	if e != nil {
		t.Fatal(e)
	}
	defer d.Root.Close()
	if e = d.Put("../escape.bin", data); e == nil {
		t.Fatal("path accepted")
	}
	p := metadata{Photo: Photo{ID: id.New(), Version: 1}, User: id.New()}
	s := Service{Key: bytes.Repeat([]byte{1}, 32), Auth: &auth.Service{Origin: "https://podhod.test"}}
	u := s.url(p, "image", time.Now().Add(-time.Second))
	r := httptest.NewRequest("GET", u, nil)
	if s.authorize(r, p, "image") == nil {
		t.Fatal("expired capability accepted")
	}
}
