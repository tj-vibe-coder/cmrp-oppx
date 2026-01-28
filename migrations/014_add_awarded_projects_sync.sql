-- Migration: Add support for syncing awarded projects to another app
-- This adds a flag to track which awarded projects have been synced

-- Add synced_to_other_app flag (optional - for tracking sync status)
-- Note: If you don't need tracking, you can skip this and just query opp_status = 'OP100'
ALTER TABLE opps_monitoring ADD COLUMN synced_to_other_app INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_opps_awarded_sync 
ON opps_monitoring(opp_status, synced_to_other_app) 
WHERE opp_status = 'OP100';

-- Create a view for easy querying from the other app
CREATE VIEW IF NOT EXISTS awarded_projects AS
SELECT 
    uid,
    project_code,
    project_name,
    client,
    account_mgr,
    pic,
    bom,
    final_amt,
    margin,
    date_awarded_lost,
    opp_status,
    status,
    submitted_date,
    forecast_date,
    google_drive_folder_id,
    google_drive_folder_url,
    google_drive_folder_name,
    encoded_date,
    rev,
    synced_to_other_app,
    created_at,
    updated_at
FROM opps_monitoring
WHERE opp_status = 'OP100'
ORDER BY date_awarded_lost DESC, project_code DESC;
