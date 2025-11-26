-- Fix Account Manager and PIC column swap in database
-- This SQL script will swap the values between account_mgr and pic columns

-- Check current data before swap
SELECT 'BEFORE SWAP - Sample Data:' as status;
SELECT project_name, account_mgr, pic 
FROM opps_monitoring 
WHERE account_mgr IS NOT NULL OR pic IS NOT NULL 
ORDER BY id 
LIMIT 10;

-- Show counts
SELECT 'Data Counts:' as status;
SELECT 
  COUNT(*) as total_records,
  COUNT(account_mgr) as records_with_account_mgr,
  COUNT(pic) as records_with_pic
FROM opps_monitoring;

-- Begin transaction for safe execution
BEGIN;

-- Step 1: Create temporary column
ALTER TABLE opps_monitoring ADD COLUMN IF NOT EXISTS temp_account_mgr TEXT;

-- Step 2: Copy account_mgr to temp column
UPDATE opps_monitoring SET temp_account_mgr = account_mgr;

-- Step 3: Move pic to account_mgr
UPDATE opps_monitoring SET account_mgr = pic;

-- Step 4: Move original account_mgr (from temp) to pic
UPDATE opps_monitoring SET pic = temp_account_mgr;

-- Step 5: Drop temporary column
ALTER TABLE opps_monitoring DROP COLUMN temp_account_mgr;

-- Verify the swap
SELECT 'AFTER SWAP - Sample Data:' as status;
SELECT project_name, account_mgr, pic 
FROM opps_monitoring 
WHERE account_mgr IS NOT NULL OR pic IS NOT NULL 
ORDER BY id 
LIMIT 10;

-- Show final counts
SELECT 'Final Data Counts:' as status;
SELECT 
  COUNT(*) as total_records,
  COUNT(account_mgr) as records_with_account_mgr,
  COUNT(pic) as records_with_pic
FROM opps_monitoring;

-- IMPORTANT: Uncomment the next line to commit the changes
-- COMMIT;

-- If you're not sure, rollback instead:
ROLLBACK;

-- Instructions:
-- 1. Review the BEFORE SWAP data to confirm the columns are indeed swapped
-- 2. If confirmed, comment out ROLLBACK and uncomment COMMIT
-- 3. Run this script again to apply the changes