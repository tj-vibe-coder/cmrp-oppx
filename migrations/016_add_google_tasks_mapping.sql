-- Migration 016: Add Google Tasks mapping table
-- Maps PIC assignments to Google Tasks so we can mark them complete when submitted

CREATE TABLE IF NOT EXISTS google_tasks_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    opportunity_uid TEXT NOT NULL,
    google_task_id TEXT NOT NULL,
    task_list_id TEXT NOT NULL DEFAULT '@default',
    task_title TEXT,
    status TEXT DEFAULT 'needsAction',  -- needsAction or completed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    UNIQUE(user_id, opportunity_uid)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_google_tasks_user_opp ON google_tasks_mapping(user_id, opportunity_uid);
CREATE INDEX IF NOT EXISTS idx_google_tasks_status ON google_tasks_mapping(status);
