package media

import (
	"bytes"
	"encoding/binary"
	"errors"
	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp"
	"image"
	"image/color"
	"image/jpeg"
	_ "image/png"
)

func processImage(data []byte, mime string) ([]byte, []byte, int, int, error) {
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil || "image/"+format != mime || cfg.Width < 1 || cfg.Height < 1 || int64(cfg.Width)*int64(cfg.Height) > 30_000_000 {
		return nil, nil, 0, 0, errors.New("invalid_image")
	}
	src, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, nil, 0, 0, errors.New("invalid_image")
	}
	small := resize(src, 2048)
	src = nil
	upright := orient(small, orientation(data))
	small = nil
	thumb := resize(upright, 256)
	var full, tiny bytes.Buffer
	if err = jpeg.Encode(&full, upright, &jpeg.Options{Quality: 85}); err != nil {
		return nil, nil, 0, 0, err
	}
	if err = jpeg.Encode(&tiny, thumb, &jpeg.Options{Quality: 75}); err != nil {
		return nil, nil, 0, 0, err
	}
	// Re-encoding creates fresh JPEGs without EXIF, GPS or client metadata.
	return full.Bytes(), tiny.Bytes(), upright.Bounds().Dx(), upright.Bounds().Dy(), nil
}
func resize(src image.Image, edge int) *image.RGBA {
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	if max(w, h) > edge {
		if w >= h {
			h = max(1, h*edge/w)
			w = edge
		} else {
			w = max(1, w*edge/h)
			h = edge
		}
	}
	dst := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(dst, dst.Bounds(), &image.Uniform{C: color.White}, image.Point{}, draw.Src)
	draw.ApproxBiLinear.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Over, nil)
	return dst
}
func orient(src *image.RGBA, n int) *image.RGBA {
	if n <= 1 || n > 8 {
		return src
	}
	w, h := src.Bounds().Dx(), src.Bounds().Dy()
	ow, oh := w, h
	if n >= 5 {
		ow, oh = h, w
	}
	dst := image.NewRGBA(image.Rect(0, 0, ow, oh))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			dx, dy := x, y
			switch n {
			case 2:
				dx = w - 1 - x
			case 3:
				dx, dy = w-1-x, h-1-y
			case 4:
				dy = h - 1 - y
			case 5:
				dx, dy = y, x
			case 6:
				dx, dy = h-1-y, x
			case 7:
				dx, dy = h-1-y, w-1-x
			case 8:
				dx, dy = y, w-1-x
			}
			dst.SetRGBA(dx, dy, src.RGBAAt(x, y))
		}
	}
	return dst
}
func tiffOrientation(b []byte) int {
	if bytes.HasPrefix(b, []byte("Exif\x00\x00")) {
		b = b[6:]
	}
	if len(b) < 8 {
		return 1
	}
	var order binary.ByteOrder
	if string(b[:2]) == "II" {
		order = binary.LittleEndian
	} else if string(b[:2]) == "MM" {
		order = binary.BigEndian
	} else {
		return 1
	}
	if order.Uint16(b[2:4]) != 42 {
		return 1
	}
	off := uint64(order.Uint32(b[4:8]))
	if off+2 > uint64(len(b)) {
		return 1
	}
	count := int(order.Uint16(b[off : off+2]))
	if count > 4096 {
		return 1
	}
	for i := 0; i < count; i++ {
		p := off + 2 + uint64(i)*12
		if p+12 > uint64(len(b)) {
			return 1
		}
		e := b[p : p+12]
		if order.Uint16(e[:2]) == 0x112 && order.Uint16(e[2:4]) == 3 && order.Uint32(e[4:8]) == 1 {
			n := int(order.Uint16(e[8:10]))
			if n >= 1 && n <= 8 {
				return n
			}
		}
	}
	return 1
}
func orientation(b []byte) int {
	if len(b) > 2 && b[0] == 255 && b[1] == 216 {
		for p := 2; p+4 <= len(b); {
			if b[p] != 255 {
				return 1
			}
			m := b[p+1]
			p += 2
			if m == 0xda || m == 0xd9 {
				return 1
			}
			if m == 0xff {
				p--
				continue
			}
			if m == 0x01 || (m >= 0xd0 && m <= 0xd7) {
				continue
			}
			n := int(binary.BigEndian.Uint16(b[p : p+2]))
			if n < 2 || p+n > len(b) {
				return 1
			}
			if m == 0xe1 && bytes.HasPrefix(b[p+2:p+n], []byte("Exif\x00\x00")) {
				return tiffOrientation(b[p+2 : p+n])
			}
			p += n
		}
	} else if bytes.HasPrefix(b, []byte("\x89PNG\r\n\x1a\n")) {
		for p := 8; p+12 <= len(b); {
			n := uint64(binary.BigEndian.Uint32(b[p : p+4]))
			if n+uint64(p)+12 > uint64(len(b)) {
				return 1
			}
			if string(b[p+4:p+8]) == "eXIf" {
				return tiffOrientation(b[p+8 : p+8+int(n)])
			}
			p += int(n) + 12
		}
	} else if len(b) >= 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WEBP" {
		for p := 12; p+8 <= len(b); {
			n := uint64(binary.LittleEndian.Uint32(b[p+4 : p+8]))
			if n+uint64(p)+8 > uint64(len(b)) {
				return 1
			}
			if string(b[p:p+4]) == "EXIF" {
				return tiffOrientation(b[p+8 : p+8+int(n)])
			}
			p += 8 + int(n) + (int(n) & 1)
		}
	}
	return 1
}
