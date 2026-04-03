package respond_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJSON(t *testing.T) {
	w := httptest.NewRecorder()
	respond.JSON(w, http.StatusOK, map[string]string{"hello": "world"})

	resp := w.Result()
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

	var body map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "world", body["hello"])
}

func TestError_NotFound(t *testing.T) {
	w := httptest.NewRecorder()
	respond.Error(w, errors.NotFound("space", "abc-123"))

	resp := w.Result()
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)

	var body map[string]map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "not_found", body["error"]["code"])
	assert.Equal(t, "space not found: abc-123", body["error"]["message"])
}

func TestError_Validation(t *testing.T) {
	w := httptest.NewRecorder()
	respond.Error(w, errors.Validation("title is required"))

	resp := w.Result()
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var body map[string]map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "validation", body["error"]["code"])
}

func TestDecode(t *testing.T) {
	type payload struct {
		Name string `json:"name"`
	}

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"test"}`))
	r.Header.Set("Content-Type", "application/json")

	var p payload
	err := respond.Decode(r, &p)
	require.NoError(t, err)
	assert.Equal(t, "test", p.Name)
}

func TestDecode_InvalidJSON(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`not json`))

	var dst map[string]any
	err := respond.Decode(r, &dst)
	require.Error(t, err)
	assert.True(t, errors.IsValidation(err))
}
