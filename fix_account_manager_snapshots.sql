-- Fix Account Manager Snapshots with Correct Historical Data
-- This updates the snapshots to contain actual historical data instead of current data

-- Update weekly snapshots (June 11th data)
UPDATE account_manager_snapshots SET 
    total_opportunities = 79,
    submitted_count = 48,
    submitted_amount = 299503293.32,
    op30_count = 20,
    op30_amount = 156137903.99
WHERE account_manager = 'CBD' AND snapshot_type = 'weekly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 22,
    submitted_count = 17,
    submitted_amount = 51100894.32,
    op30_count = 11,
    op30_amount = 43981352.67
WHERE account_manager = 'LOS' AND snapshot_type = 'weekly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 125,
    submitted_count = 92,
    submitted_amount = 439497563.03,
    op100_count = 15,
    op100_amount = 5787514.73,
    op30_count = 62,
    op30_amount = 423266836.15
WHERE account_manager = 'NSG' AND snapshot_type = 'weekly';

-- Update monthly snapshots (May 18th data)
UPDATE account_manager_snapshots SET 
    total_opportunities = 68,
    submitted_count = 43,
    submitted_amount = 265699500.15,
    op90_count = 4,
    op90_amount = 16984446.06,
    op60_count = 5,
    op60_amount = 55387227.27,
    op30_count = 17,
    op30_amount = 123392407.05
WHERE account_manager = 'CBD' AND snapshot_type = 'monthly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 7,
    submitted_count = 7,
    submitted_amount = 14525820.54
WHERE account_manager = 'ISP' AND snapshot_type = 'monthly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 109,
    submitted_count = 68,
    submitted_amount = 252304615.37,
    op90_count = 9,
    op90_amount = 21234472.93,
    op60_count = 17,
    op60_amount = 60668728.77,
    op30_count = 10,
    op30_amount = 86157923.45
WHERE account_manager = 'JMO' AND snapshot_type = 'monthly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 22,
    submitted_count = 17,
    submitted_amount = 51100894.32,
    op30_count = 11,
    op30_amount = 43981352.67
WHERE account_manager = 'LOS' AND snapshot_type = 'monthly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 98,
    submitted_count = 69,
    submitted_amount = 313864121.87,
    op100_count = 12,
    op100_amount = 5404967.49,
    op90_count = 4,
    op90_amount = 5170196.08,
    op60_count = 2,
    op60_amount = 1069044.93,
    op30_count = 46,
    op30_amount = 302013821.95
WHERE account_manager = 'NSG' AND snapshot_type = 'monthly';

UPDATE account_manager_snapshots SET 
    total_opportunities = 42,
    submitted_count = 32,
    submitted_amount = 88709597.87
WHERE account_manager = 'RTR' AND snapshot_type = 'monthly';
