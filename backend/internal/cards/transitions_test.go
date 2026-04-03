package cards

import (
	"testing"

	"github.com/matthewmcgibbon/spaces/backend/internal/platform/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateTransition(t *testing.T) {
	tests := []struct {
		name    string
		from    Column
		to      Column
		wantErr bool
	}{
		// Valid transitions
		{name: "inbox to icebox", from: ColumnInbox, to: ColumnIcebox, wantErr: false},
		{name: "inbox to freezer", from: ColumnInbox, to: ColumnFreezer, wantErr: false},
		{name: "inbox to planned", from: ColumnInbox, to: ColumnPlanned, wantErr: false},
		{name: "icebox to planned", from: ColumnIcebox, to: ColumnPlanned, wantErr: false},
		{name: "icebox to freezer", from: ColumnIcebox, to: ColumnFreezer, wantErr: false},
		{name: "freezer to icebox", from: ColumnFreezer, to: ColumnIcebox, wantErr: false},
		{name: "freezer to planned", from: ColumnFreezer, to: ColumnPlanned, wantErr: false},
		{name: "planned to in_progress", from: ColumnPlanned, to: ColumnInProgress, wantErr: false},
		{name: "in_progress to review", from: ColumnInProgress, to: ColumnReview, wantErr: false},
		{name: "in_progress to planned", from: ColumnInProgress, to: ColumnPlanned, wantErr: false},
		{name: "review to done", from: ColumnReview, to: ColumnDone, wantErr: false},
		{name: "review to in_progress", from: ColumnReview, to: ColumnInProgress, wantErr: false},
		{name: "done to in_progress (reopen)", from: ColumnDone, to: ColumnInProgress, wantErr: false},

		// Invalid transitions
		{name: "inbox to done (skip)", from: ColumnInbox, to: ColumnDone, wantErr: true},
		{name: "planned to review (skip)", from: ColumnPlanned, to: ColumnReview, wantErr: true},
		{name: "freezer to done (skip)", from: ColumnFreezer, to: ColumnDone, wantErr: true},
		{name: "done to planned (no backwards skip)", from: ColumnDone, to: ColumnPlanned, wantErr: true},
		{name: "inbox same column", from: ColumnInbox, to: ColumnInbox, wantErr: true},
		{name: "planned same column", from: ColumnPlanned, to: ColumnPlanned, wantErr: true},
		{name: "done same column", from: ColumnDone, to: ColumnDone, wantErr: true},
		{name: "inbox to in_progress (skip)", from: ColumnInbox, to: ColumnInProgress, wantErr: true},
		{name: "icebox to done (skip)", from: ColumnIcebox, to: ColumnDone, wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateTransition(tc.from, tc.to)
			if tc.wantErr {
				require.Error(t, err)
				assert.True(t, errors.IsValidation(err), "expected validation error, got: %v", err)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
