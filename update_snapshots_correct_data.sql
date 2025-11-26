-- Update Snapshots with Correct Data
-- This script updates the weekly and monthly snapshots to match the actual data provided

-- Update Weekly Snapshot (June 11 data)
UPDATE dashboard_snapshots 
SET 
    total_opportunities = 428,
    submitted_count = 270,
    submitted_amount = 988982107.40,
    op100_count = 38,
    op100_amount = 59237774.52,
    op90_count = 27,
    op90_amount = 48294418.13,
    op60_count = 41,
    op60_amount = 166184874.70,
    op30_count = 120,
    op30_amount = 661162427.75,
    lost_count = 31,
    lost_amount = 59020750.46,
    inactive_count = 8,
    ongoing_count = 19,
    pending_count = 29,
    declined_count = 109,
    revised_count = 104,
    saved_date = CURRENT_TIMESTAMP
WHERE snapshot_type = 'weekly'
ORDER BY saved_date DESC
LIMIT 1;

-- Update Monthly Snapshot (Monthly data provided)
UPDATE dashboard_snapshots 
SET 
    total_opportunities = 409,
    submitted_count = 271,
    submitted_amount = 939235994.10,
    op100_count = 34,
    op100_amount = 56135271.31,
    op90_count = 29,
    op90_amount = 43222843.87,
    op60_count = 41,
    op60_amount = 188367129.90,
    op30_count = 108,
    op30_amount = 620682214.65,
    lost_count = 31,
    lost_amount = 52993964.75,
    inactive_count = 7,
    ongoing_count = 22,
    pending_count = 27,
    declined_count = 102,
    revised_count = 99,
    saved_date = CURRENT_TIMESTAMP
WHERE snapshot_type = 'monthly'
ORDER BY saved_date DESC
LIMIT 1;

-- Verify the updates
SELECT 
    snapshot_type,
    op100_count,
    op100_amount,
    total_opportunities,
    saved_date
FROM dashboard_snapshots 
WHERE snapshot_type IN ('weekly', 'monthly')
ORDER BY snapshot_type, saved_date DESC; 