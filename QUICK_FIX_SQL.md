# Quick Fix for Google Drive Sync Error

## Problem
The Google Drive sync feature is failing in production with the error:
```
Sync failed: Database update failed: column "last_excel_sync" of relation "opps_monitoring" does not exist
```

## Solution

### Option 1: Run the Migration Script (Recommended)
```bash
node fix_last_excel_sync_column.js
```

### Option 2: Run SQL Directly in Production Database
Connect to your production PostgreSQL database and run:

```sql
-- Add the missing column
ALTER TABLE opps_monitoring 
ADD COLUMN IF NOT EXISTS last_excel_sync TIMESTAMP;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_opps_monitoring_last_excel_sync 
ON opps_monitoring(last_excel_sync);

-- Add documentation comment
COMMENT ON COLUMN opps_monitoring.last_excel_sync 
IS 'Timestamp of last sync from Excel/Google Drive file';
```

### Verification
After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'opps_monitoring' 
AND column_name = 'last_excel_sync';

-- Should return one row showing the new column
```

## What This Fixes
- ✅ Google Drive sync from Excel files will work
- ✅ "Sync from Drive" button in edit modal will work  
- ✅ No more 500 errors during sync operations

## Files Changed
- `/migrations/005_add_last_excel_sync_column.sql` - Official migration
- `/fix_last_excel_sync_column.js` - Standalone script to apply migration
- **Header color issue also fixed in styles.css**