package pagination

import (
	"encoding/base64"
	"net/http"
	"strconv"
)

const (
	defaultLimit = 50
	maxLimit     = 200
)

// Params holds pagination query parameters.
type Params struct {
	Cursor string
	Limit  int
}

// PageInfo holds information about the next page.
type PageInfo struct {
	NextCursor string `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more"`
}

// Response is a generic paginated response.
type Response[T any] struct {
	Data       []T      `json:"data"`
	Pagination PageInfo `json:"pagination"`
}

// ParseFromRequest reads cursor and limit query parameters from the request.
// Default limit is 50, max limit is 200.
func ParseFromRequest(r *http.Request) Params {
	q := r.URL.Query()

	cursor := q.Get("cursor")

	limit := defaultLimit
	if raw := q.Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	return Params{Cursor: cursor, Limit: limit}
}

// EncodeCursor encodes a cursor key to a base64 URL-safe string.
func EncodeCursor(key string) string {
	return base64.URLEncoding.EncodeToString([]byte(key))
}

// DecodeCursor decodes a base64 URL-safe cursor string back to the key.
func DecodeCursor(s string) (string, error) {
	b, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return "", err
	}
	return string(b), nil
}
