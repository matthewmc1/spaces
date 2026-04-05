package integrations

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/matthewmcgibbon/spaces/backend/internal/platform/respond"
)

// Card reference pattern: matches SPACES-<uuid-prefix> in text
// e.g., "fixes SPACES-a1b2c3d4" references a card whose ID starts with a1b2c3d4
var cardRefPattern = regexp.MustCompile(`SPACES-([a-f0-9]{8,})`)

// githubPushEvent is a minimal subset of the GitHub push payload we care about.
type githubPushEvent struct {
	Commits []struct {
		ID      string `json:"id"`
		Message string `json:"message"`
		URL     string `json:"url"`
	} `json:"commits"`
}

// githubPREvent is a minimal subset of the GitHub pull_request event payload.
type githubPREvent struct {
	Action      string `json:"action"`
	PullRequest struct {
		Number  int    `json:"number"`
		Title   string `json:"title"`
		Body    string `json:"body"`
		HTMLURL string `json:"html_url"`
		State   string `json:"state"`
		Merged  bool   `json:"merged"`
	} `json:"pull_request"`
}

// githubIssueEvent is a minimal subset of the GitHub issues event payload.
type githubIssueEvent struct {
	Action string `json:"action"`
	Issue  struct {
		Number  int    `json:"number"`
		Title   string `json:"title"`
		Body    string `json:"body"`
		HTMLURL string `json:"html_url"`
		State   string `json:"state"`
	} `json:"issue"`
}

// HandleWebhook handles POST /webhooks/{provider}?tenant=<uuid>
// Currently supports GitHub events: push, pull_request, issues.
// TODO: Add signature verification using per-integration webhook secrets.
// TODO: Add GitLab event parsing.
func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	if provider != "github" && provider != "gitlab" {
		respond.Error(w, errors.Validation("unsupported provider"))
		return
	}

	tenantStr := r.URL.Query().Get("tenant")
	tenantID, err := uuid.Parse(tenantStr)
	if err != nil {
		respond.Error(w, errors.Validation("missing or invalid tenant query param"))
		return
	}

	// Look up active integration for this tenant+provider
	integration, err := h.svc.GetByProvider(r.Context(), tenantID, provider)
	if err != nil {
		respond.Error(w, err)
		return
	}

	eventType := r.Header.Get("X-GitHub-Event")
	if provider == "gitlab" {
		eventType = r.Header.Get("X-Gitlab-Event")
	}

	// Decode body based on event type
	switch provider {
	case "github":
		if err := h.handleGitHubEvent(r, tenantID, integration.ID, eventType); err != nil {
			respond.Error(w, err)
			return
		}
	case "gitlab":
		// TODO: Implement GitLab event parsing
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) handleGitHubEvent(r *http.Request, tenantID, integrationID uuid.UUID, eventType string) error {
	ctx := r.Context()

	switch eventType {
	case "pull_request":
		var ev githubPREvent
		if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
			return errors.Validation("invalid pull_request payload")
		}
		cardIDs := extractCardRefs(ev.PullRequest.Title + " " + ev.PullRequest.Body)
		status := ev.PullRequest.State
		if ev.PullRequest.Merged {
			status = "merged"
		}
		for _, cardID := range cardIDs {
			_, _ = h.svc.CreateCardLink(ctx, tenantID, cardID, CreateCardLinkInput{
				IntegrationID: integrationID,
				ExternalType:  "pull_request",
				ExternalID:    strconv.Itoa(ev.PullRequest.Number),
				ExternalURL:   ev.PullRequest.HTMLURL,
				Title:         ev.PullRequest.Title,
				Status:        status,
			})
		}

	case "issues":
		var ev githubIssueEvent
		if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
			return errors.Validation("invalid issues payload")
		}
		cardIDs := extractCardRefs(ev.Issue.Title + " " + ev.Issue.Body)
		for _, cardID := range cardIDs {
			_, _ = h.svc.CreateCardLink(ctx, tenantID, cardID, CreateCardLinkInput{
				IntegrationID: integrationID,
				ExternalType:  "issue",
				ExternalID:    strconv.Itoa(ev.Issue.Number),
				ExternalURL:   ev.Issue.HTMLURL,
				Title:         ev.Issue.Title,
				Status:        ev.Issue.State,
			})
		}

	case "push":
		var ev githubPushEvent
		if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
			return errors.Validation("invalid push payload")
		}
		for _, commit := range ev.Commits {
			cardIDs := extractCardRefs(commit.Message)
			for _, cardID := range cardIDs {
				_, _ = h.svc.CreateCardLink(ctx, tenantID, cardID, CreateCardLinkInput{
					IntegrationID: integrationID,
					ExternalType:  "commit",
					ExternalID:    commit.ID,
					ExternalURL:   commit.URL,
					Title:         firstLine(commit.Message),
					Status:        "passing",
				})
			}
		}
	}

	return nil
}

// extractCardRefs parses text for SPACES-<uuid-prefix> patterns and looks up
// matching card IDs. Returns card UUIDs that exist and match the prefix.
// NOTE: For simplicity we accept refs as full UUIDs only. A prefix-match
// implementation would require a DB lookup per ref.
func extractCardRefs(text string) []uuid.UUID {
	matches := cardRefPattern.FindAllStringSubmatch(text, -1)
	var ids []uuid.UUID
	for _, m := range matches {
		if len(m) < 2 {
			continue
		}
		if id, err := uuid.Parse(m[1]); err == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

func firstLine(s string) string {
	if i := strings.IndexByte(s, '\n'); i >= 0 {
		return s[:i]
	}
	return s
}
