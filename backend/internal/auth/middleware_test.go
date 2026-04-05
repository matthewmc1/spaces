package auth_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/matthewmcgibbon/spaces/backend/internal/auth"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// mockVerifier implements auth.TokenVerifier for testing.
type mockVerifier struct {
	claims *auth.Claims
	err    error
}

func (m *mockVerifier) Verify(_ context.Context, _ string) (*auth.Claims, error) {
	return m.claims, m.err
}

func TestAuthMiddleware_Success(t *testing.T) {
	userID := uuid.New()
	tenantID := uuid.New()
	expectedClaims := &auth.Claims{
		UserID:   userID,
		TenantID: tenantID,
		Email:    "user@example.com",
		Role:     "member",
	}

	mv := &mockVerifier{claims: expectedClaims}
	mw := auth.NewMiddleware(mv, nil)

	var (
		gotClaims  *auth.Claims
		gotTenant  uuid.UUID
		handlerHit bool
	)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerHit = true
		var err error
		gotClaims, err = auth.FromContext(r.Context())
		require.NoError(t, err)
		gotTenant, err = tenant.FromContext(r.Context())
		require.NoError(t, err)
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rr := httptest.NewRecorder()

	mw.Handler(inner).ServeHTTP(rr, req)

	assert.True(t, handlerHit, "inner handler should have been called")
	assert.Equal(t, http.StatusOK, rr.Code)
	assert.Equal(t, expectedClaims, gotClaims)
	assert.Equal(t, tenantID, gotTenant)
}

func TestAuthMiddleware_MissingHeader_Returns401(t *testing.T) {
	mv := &mockVerifier{claims: &auth.Claims{}}
	mw := auth.NewMiddleware(mv, nil)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("inner handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rr := httptest.NewRecorder()

	mw.Handler(inner).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestAuthMiddleware_InvalidToken_Returns401(t *testing.T) {
	mv := &mockVerifier{err: fmt.Errorf("bad token")}
	mw := auth.NewMiddleware(mv, nil)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("inner handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer bad-token")
	rr := httptest.NewRecorder()

	mw.Handler(inner).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}

func TestAuthMiddleware_VerifierReturnsUnauthorized_Returns401(t *testing.T) {
	mv := &mockVerifier{err: errors.Unauthorized("token expired")}
	mw := auth.NewMiddleware(mv, nil)

	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("inner handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer expired-token")
	rr := httptest.NewRecorder()

	mw.Handler(inner).ServeHTTP(rr, req)

	assert.Equal(t, http.StatusUnauthorized, rr.Code)
}
