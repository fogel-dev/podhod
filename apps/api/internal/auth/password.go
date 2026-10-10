package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"
	"unicode/utf8"

	"golang.org/x/crypto/argon2"
)

func validPassword(password string) bool {
	n := utf8.RuneCountInString(password)
	return utf8.ValidString(password) && n >= 15 && n <= 128
}

func hashPassword(password string) string {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		panic("secure randomness unavailable")
	}
	hash := argon2.IDKey([]byte(password), salt, 2, 19*1024, 1, 32)
	return fmt.Sprintf("$argon2id$v=19$m=19456,t=2,p=1$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash))
}

func verifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" || parts[2] != "v=19" {
		return false
	}
	var memory, iterations uint32
	var parallel uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallel); err != nil {
		return false
	}
	// Bounded parsing prevents malformed database values from exhausting memory.
	if memory < 19*1024 || memory > 64*1024 || iterations < 2 || iterations > 5 || parallel < 1 || parallel > 4 {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) != 16 {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) != 32 {
		return false
	}
	actual := argon2.IDKey([]byte(password), salt, iterations, memory, parallel, 32)
	return subtle.ConstantTimeCompare(expected, actual) == 1
}
