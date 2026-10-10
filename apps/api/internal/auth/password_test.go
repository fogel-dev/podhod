package auth

import (
	"strings"
	"testing"
)

func TestPasswordLength(t *testing.T) {
	for _, tc := range []struct {
		password string
		valid    bool
	}{
		{"1234567", false},
		{"12345678", true},
		{"пароль 8", true},
		{strings.Repeat("я", 128), true},
		{strings.Repeat("я", 129), false},
		{string([]byte{0xff}) + "12345678", false},
	} {
		if got := validPassword(tc.password); got != tc.valid {
			t.Errorf("validPassword for length %d = %v, want %v", len(tc.password), got, tc.valid)
		}
	}
}
