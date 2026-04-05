package auth

import (
	"net/http"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
	"github.com/matthewmcgibbon/spaces/backend/internal/tenant"
)

// AuthHandler holds HTTP handler methods for auth lifecycle endpoints.
type AuthHandler struct {
	svc *AuthService
}

// NewAuthHandler creates a new AuthHandler with the given AuthService.
func NewAuthHandler(svc *AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// HandleMe handles GET /auth/me — returns the current authenticated user.
func (h *AuthHandler) HandleMe(w http.ResponseWriter, r *http.Request) {
	claims, err := FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	user, err := h.svc.GetCurrentUser(r.Context(), claims)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusOK, user)
}

// HandleSignup handles POST /auth/signup — creates a new org and owner user.
func (h *AuthHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	var input SignupInput
	if err := respond.Decode(r, &input); err != nil {
		respond.Error(w, err)
		return
	}

	user, err := h.svc.Signup(r.Context(), input)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, user)
}

// HandleInviteUser handles POST /auth/users — invites a new user to the tenant.
func (h *AuthHandler) HandleInviteUser(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	var body struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}
	if err := respond.Decode(r, &body); err != nil {
		respond.Error(w, err)
		return
	}

	user, err := h.svc.InviteUser(r.Context(), tenantID, body.Name, body.Email, body.Role)
	if err != nil {
		respond.Error(w, err)
		return
	}

	respond.JSON(w, http.StatusCreated, user)
}

// HandleListUsers handles GET /auth/users — lists all users in the tenant.
func (h *AuthHandler) HandleListUsers(w http.ResponseWriter, r *http.Request) {
	tenantID, err := tenant.FromContext(r.Context())
	if err != nil {
		respond.Error(w, err)
		return
	}

	users, err := h.svc.ListUsers(r.Context(), tenantID)
	if err != nil {
		respond.Error(w, err)
		return
	}

	if users == nil {
		users = []User{}
	}

	respond.JSON(w, http.StatusOK, users)
}
