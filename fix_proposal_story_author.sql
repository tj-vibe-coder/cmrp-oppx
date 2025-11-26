-- Fix proposal story author recognition issue
-- The database function was looking for 'username' field but users table has 'name' field

-- Drop and recreate the function with the correct field name
DROP FUNCTION IF EXISTS get_proposal_story(UUID);

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
        pt.author::TEXT,  -- Cast to TEXT to match function signature
        pt.story_title,
        pt.story_content,
        pt.entry_category,
        pt.story_priority,
        pt.story_subtype,
        pt.reference_id,
        pt.story_metadata,
        pt.is_manual,
        -- Try to get user role from users table using 'name' field (not 'username')
        COALESCE(
            (SELECT account_type FROM users WHERE name = pt.author LIMIT 1),
            'User'
        )::TEXT as author_role
    FROM proposal_timeline pt
    WHERE pt.opportunity_uid = p_opportunity_uid
    ORDER BY pt.timeline_date DESC;
END;
$$ LANGUAGE plpgsql;