package cards

import "github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"

// validTransitions maps each column to the set of columns it can transition to.
var validTransitions = map[Column][]Column{
	ColumnInbox:      {ColumnIcebox, ColumnFreezer, ColumnPlanned},
	ColumnIcebox:     {ColumnPlanned, ColumnFreezer},
	ColumnFreezer:    {ColumnIcebox, ColumnPlanned},
	ColumnPlanned:    {ColumnInProgress},
	ColumnInProgress: {ColumnReview, ColumnPlanned},
	ColumnReview:     {ColumnDone, ColumnInProgress},
	ColumnDone:       {ColumnInProgress},
}

// ValidateTransition checks whether transitioning from one column to another is allowed.
// It returns a validation error for same-column moves or invalid transitions.
func ValidateTransition(from, to Column) error {
	if from == to {
		return errors.Validation("cannot move card to the same column")
	}

	allowed, ok := validTransitions[from]
	if !ok {
		return errors.Validation("unknown source column: " + string(from))
	}

	for _, col := range allowed {
		if col == to {
			return nil
		}
	}

	return errors.Validation("invalid transition from " + string(from) + " to " + string(to))
}
