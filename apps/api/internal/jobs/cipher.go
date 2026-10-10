package jobs

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
)

type PayloadCipher struct{ aead cipher.AEAD }

func NewCipher(keyHex string) (*PayloadCipher, error) {
	key, err := hex.DecodeString(keyHex)
	if err != nil || len(key) != 32 {
		return nil, errors.New("JOB_ENCRYPTION_KEY must be 32 bytes encoded as hex")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &PayloadCipher{aead: aead}, nil
}

func (c *PayloadCipher) Seal(jobID, kind string, payload []byte) []byte {
	nonce := make([]byte, c.aead.NonceSize())
	_, _ = rand.Read(nonce)
	// Versioned envelope. ID and kind are authenticated against swapping ciphertexts.
	output := append([]byte{1}, nonce...)
	return c.aead.Seal(output, nonce, payload, []byte(jobID+":"+kind))
}

func (c *PayloadCipher) Open(jobID, kind string, data []byte) ([]byte, error) {
	n := c.aead.NonceSize()
	if len(data) < 1+n+c.aead.Overhead() || data[0] != 1 {
		return nil, errors.New("invalid encrypted job payload")
	}
	value, err := c.aead.Open(nil, data[1:1+n], data[1+n:], []byte(jobID+":"+kind))
	if err != nil {
		return nil, errors.New("invalid encrypted job payload")
	}
	return value, nil
}
