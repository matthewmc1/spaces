package goals

import (
	"context"

	"github.com/google/uuid"
)

// ChainNode represents a single node (goal or card) in an alignment chain.
type ChainNode struct {
	ID         uuid.UUID `json:"id"`
	Type       string    `json:"type"` // "goal" or "card"
	Title      string    `json:"title"`
	Status     string    `json:"status,omitempty"`
	SpaceID    uuid.UUID `json:"space_id"`
	SpaceName  string    `json:"space_name"`
	SpaceType  string    `json:"space_type"`
	LinkType   string    `json:"link_type,omitempty"`
	Priority   string    `json:"priority,omitempty"`
	ColumnName string    `json:"column_name,omitempty"`
	WorkType   string    `json:"work_type,omitempty"`
}

// AlignmentChain holds the focal goal, its ancestors, and its supporters.
type AlignmentChain struct {
	Goal       ChainNode   `json:"goal"`
	Ancestors  []ChainNode `json:"ancestors"`
	Supporters []ChainNode `json:"supporters"`
}

// GetChain builds the full alignment chain for a goal.
func (s *Service) GetChain(ctx context.Context, tenantID, goalID uuid.UUID) (*AlignmentChain, error) {
	focalNode, err := s.repo.GetGoalWithSpace(ctx, tenantID, goalID)
	if err != nil {
		return nil, err
	}
	ancestors, err := s.repo.GetChainUp(ctx, tenantID, goalID)
	if err != nil {
		ancestors = []ChainNode{}
	}
	supporters, err := s.repo.GetChainDown(ctx, tenantID, goalID)
	if err != nil {
		supporters = []ChainNode{}
	}

	return &AlignmentChain{
		Goal:       *focalNode,
		Ancestors:  ancestors,
		Supporters: supporters,
	}, nil
}
