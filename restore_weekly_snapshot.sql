-- Restore proper weekly snapshot (428 opportunities)
UPDATE dashboard_snapshots 
SET total_opportunities = 428,
    submitted_count = 270,
    submitted_amount = 1070370000.00,
    op100_count = 38,
    op100_amount = 45000000.00,
    op90_count = 27,
    op90_amount = 89000000.00
WHERE snapshot_type = 'weekly';
