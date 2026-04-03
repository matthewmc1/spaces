package pagination_test

import (
	"net/http/httptest"
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/pagination"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseFromRequest_Defaults(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	p := pagination.ParseFromRequest(r)
	assert.Equal(t, 50, p.Limit)
	assert.Equal(t, "", p.Cursor)
}

func TestParseFromRequest_CustomValues(t *testing.T) {
	r := httptest.NewRequest("GET", "/?limit=25&cursor=abc", nil)
	p := pagination.ParseFromRequest(r)
	assert.Equal(t, 25, p.Limit)
	assert.Equal(t, "abc", p.Cursor)
}

func TestParseFromRequest_MaxLimitCap(t *testing.T) {
	r := httptest.NewRequest("GET", "/?limit=999", nil)
	p := pagination.ParseFromRequest(r)
	assert.Equal(t, 200, p.Limit)
}

func TestParseFromRequest_ExactMaxLimit(t *testing.T) {
	r := httptest.NewRequest("GET", "/?limit=200", nil)
	p := pagination.ParseFromRequest(r)
	assert.Equal(t, 200, p.Limit)
}

func TestCursorRoundTrip(t *testing.T) {
	original := "2024-01-01T00:00:00Z:uuid-abc-123"
	encoded := pagination.EncodeCursor(original)
	assert.NotEmpty(t, encoded)
	assert.NotEqual(t, original, encoded)

	decoded, err := pagination.DecodeCursor(encoded)
	require.NoError(t, err)
	assert.Equal(t, original, decoded)
}

func TestDecodeCursor_InvalidBase64(t *testing.T) {
	_, err := pagination.DecodeCursor("!!!invalid!!!")
	assert.Error(t, err)
}
