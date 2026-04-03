-- +goose Up
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'on_track'
    CHECK (status IN ('on_track', 'at_risk', 'behind', 'paused'));

-- +goose Down
ALTER TABLE spaces DROP COLUMN IF EXISTS status;
