-- Proposal Story Feature - Database Schema (Final Universal Version)
-- Creates table for manual story entries to complement existing opportunity_revisions

-- Create proposal_story_entries table for manual story entries
CREATE TABLE IF NOT EXISTS proposal_story_entries (
    id SERIAL PRIMARY KEY,
    opportunity_uid UUID NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    entry_type TEXT DEFAULT 'comment', -- 'comment', 'milestone', 'note', 'status_update'
    title TEXT, -- Optional title for milestones or important updates
    content TEXT NOT NULL, -- Main story content/comment
    entry_category TEXT, -- 'user_comment', 'milestone', 'decision_point', 'client_feedback', 'internal_note'
    visibility TEXT DEFAULT 'internal', -- 'internal', 'client_visible', 'team_only'
    metadata JSONB DEFAULT '{}', -- Additional metadata (tags, mentions, attachments, etc.)
    edited_at TIMESTAMP NULL,
    edited_by TEXT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    parent_entry_id INTEGER REFERENCES proposal_story_entries(id), -- For threaded replies
    
    -- Foreign key constraints
    CONSTRAINT fk_proposal_story_opportunity 
        FOREIGN KEY (opportunity_uid) 
        REFERENCES opps_monitoring(uid) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposal_story_opportunity_uid ON proposal_story_entries(opportunity_uid);
CREATE INDEX IF NOT EXISTS idx_proposal_story_created_at ON proposal_story_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposal_story_created_by ON proposal_story_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_proposal_story_entry_type ON proposal_story_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_proposal_story_visibility ON proposal_story_entries(visibility);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_proposal_story_timeline_query 
ON proposal_story_entries(opportunity_uid, created_at DESC, is_deleted);

-- Insert entry types lookup data
CREATE TABLE IF NOT EXISTS story_entry_types (
    type_name TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Material Icons icon name
    color_class TEXT, -- CSS class for styling
    requires_title BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO story_entry_types (type_name, display_name, description, icon, color_class, requires_title) VALUES
('comment', 'Comment', 'General comment or note', 'comment', 'text-blue-600', FALSE),
('milestone', 'Milestone', 'Important project milestone', 'flag', 'text-green-600', TRUE),
('decision_point', 'Decision Point', 'Key decision or approval point', 'gavel', 'text-orange-600', TRUE),
('client_feedback', 'Client Feedback', 'Feedback from client', 'feedback', 'text-purple-600', FALSE),
('status_update', 'Status Update', 'Project status update', 'update', 'text-indigo-600', FALSE),
('internal_note', 'Internal Note', 'Internal team note', 'note', 'text-gray-600', FALSE),
('issue', 'Issue', 'Problem or issue identified', 'warning', 'text-red-600', TRUE),
('resolution', 'Resolution', 'Issue resolution or solution', 'check_circle', 'text-green-600', FALSE)
ON CONFLICT (type_name) DO NOTHING;

-- Create view that combines revision history with manual story entries (simplified version)
CREATE OR REPLACE VIEW proposal_timeline AS
SELECT 
    -- Common fields
    'revision' as source_type,
    opportunity_uid,
    changed_at as timeline_date,
    changed_by as author,
    revision_number::TEXT as reference_id,
    -- Story-specific fields
    'System Update' as story_title,
    -- Auto-generate story content from changed fields
    CASE 
        WHEN changed_fields::TEXT = '{}' OR changed_fields IS NULL THEN 'General update'
        ELSE CONCAT('Updated: ', 
            array_to_string(
                ARRAY(SELECT jsonb_object_keys(changed_fields::jsonb)), 
                ', '
            )
        )
    END as story_content,
    'system_update' as entry_category,
    'medium' as story_priority, -- Default priority for system entries
    changed_fields as story_metadata,
    NULL::INTEGER as parent_id,
    FALSE as is_manual,
    'system_change' as story_subtype
FROM opportunity_revisions
WHERE changed_fields IS NOT NULL

UNION ALL

SELECT 
    -- Common fields
    'manual' as source_type,
    opportunity_uid,
    created_at as timeline_date,
    created_by as author,
    id::TEXT as reference_id,
    -- Story-specific fields
    COALESCE(title, 
        CASE entry_type
            WHEN 'milestone' THEN 'Milestone Reached'
            WHEN 'decision_point' THEN 'Decision Point'
            WHEN 'client_feedback' THEN 'Client Feedback'
            WHEN 'status_update' THEN 'Status Update'
            ELSE 'Team Comment'
        END
    ) as story_title,
    content as story_content,
    entry_category,
    'medium' as story_priority, -- Default priority for manual entries
    metadata as story_metadata,
    parent_entry_id as parent_id,
    TRUE as is_manual,
    entry_type as story_subtype
FROM proposal_story_entries
WHERE is_deleted = FALSE

ORDER BY timeline_date DESC;

-- Create function to get complete proposal story
CREATE OR REPLACE FUNCTION get_proposal_story(p_opportunity_uid UUID)
RETURNS TABLE(
    source_type TEXT,
    timeline_date TIMESTAMP,
    author TEXT,
    story_title TEXT,
    story_content TEXT,
    entry_category TEXT,
    story_priority TEXT,
    story_subtype TEXT,
    reference_id TEXT,
    story_metadata JSONB,
    is_manual BOOLEAN,
    author_role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pt.source_type,
        pt.timeline_date,
        pt.author,
        pt.story_title,
        pt.story_content,
        pt.entry_category,
        pt.story_priority,
        pt.story_subtype,
        pt.reference_id,
        pt.story_metadata,
        pt.is_manual,
        -- Try to get user role from users table if it exists, otherwise default to 'User'
        COALESCE(
            (SELECT account_type FROM users WHERE username = pt.author LIMIT 1),
            'User'
        ) as author_role
    FROM proposal_timeline pt
    WHERE pt.opportunity_uid = p_opportunity_uid
    ORDER BY pt.timeline_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE proposal_story_entries IS 'Manual story entries for proposal timeline (comments, milestones, notes)';
COMMENT ON TABLE story_entry_types IS 'Lookup table for different types of story entries';
COMMENT ON VIEW proposal_timeline IS 'Combined view of revision history and manual story entries';
COMMENT ON FUNCTION get_proposal_story IS 'Get complete chronological story for a proposal including revisions and manual entries';

COMMENT ON COLUMN proposal_story_entries.opportunity_uid IS 'Reference to the opportunity this story entry belongs to';
COMMENT ON COLUMN proposal_story_entries.entry_type IS 'Type of entry: comment, milestone, note, status_update, etc.';
COMMENT ON COLUMN proposal_story_entries.visibility IS 'Who can see this entry: internal, client_visible, team_only';
COMMENT ON COLUMN proposal_story_entries.metadata IS 'JSON metadata for tags, mentions, attachments, formatting';
COMMENT ON COLUMN proposal_story_entries.parent_entry_id IS 'For threaded replies to other story entries';