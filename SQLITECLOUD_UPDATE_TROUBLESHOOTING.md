# SQLiteCloud Update Not Persisting - Troubleshooting Guide

## Problem
Database updates are not persisting in Render deployment with SQLiteCloud.

## Diagnostic Steps

### 1. Check Render Logs
After deploying, check Render logs for these messages:

**Good signs:**
- `✅ Connected to SQLiteCloud`
- `✅ Database initialized successfully`
- `[DB-ADAPTER] ✅ SQLiteCloud transaction started`
- `[DB-ADAPTER] ✅ SQLiteCloud transaction committed successfully`
- `[PUT] Update result: { rowCount: 1 }`
- `✅ Update verified - all fields match`

**Bad signs:**
- `❌ SQLiteCloud transaction error`
- `⚠️ UPDATE returned 0 rows affected`
- `❌ Update verification failed`
- `[DB-ADAPTER] SQLiteCloud transaction rolled back`

### 2. Test Database Connection
Visit: `https://your-app.onrender.com/api/db-test`

Expected response:
```json
{
  "success": true,
  "dbType": "sqlitecloud",
  "test": { "test": 1, "current_time": "..." },
  "databaseUrl": "Set (hidden)"
}
```

### 3. Test Transaction
Visit: `https://your-app.onrender.com/api/db-transaction-test`

This will:
- Start a transaction
- Update a test field
- Commit the transaction
- Verify the update persisted

### 4. Check DATABASE_URL in Render
1. Go to Render Dashboard → Your Service → Environment
2. Verify `DATABASE_URL` is set correctly
3. Format should be: `sqlitecloud://user:password@host.sqlite.cloud:8860/dbname?apikey=...`

## Common Issues & Solutions

### Issue 1: Transaction Not Committing
**Symptoms:**
- Logs show transaction started but no commit message
- Updates appear to work but don't persist

**Possible Causes:**
- SQLiteCloud connection timeout
- Transaction error causing silent rollback
- Connection pool issue

**Solution:**
- Check logs for transaction errors
- Verify DATABASE_URL is correct
- Check SQLiteCloud dashboard for connection issues

### Issue 2: UPDATE Returns 0 Rows Affected
**Symptoms:**
- `[PUT] Update result: { rowCount: 0 }`
- Update appears successful but no changes

**Possible Causes:**
- WHERE clause not matching (UID mismatch)
- Wrong database connection
- Read-only connection

**Solution:**
- Verify UID exists in database
- Check if DATABASE_URL points to correct database
- Verify SQLiteCloud account has write permissions

### Issue 3: Connection Timeout
**Symptoms:**
- `Failed to fetch` errors
- Transaction errors in logs

**Solution:**
- Check SQLiteCloud connection string
- Verify network connectivity from Render
- Check SQLiteCloud dashboard for service status

### Issue 4: Wrong Database
**Symptoms:**
- Updates work but data doesn't appear
- Different data in Render vs local

**Solution:**
- Verify DATABASE_URL in Render matches production database
- Check SQLiteCloud dashboard to see which database is connected
- Compare data between environments

## SQLiteCloud-Specific Checks

### Verify Write Permissions
SQLiteCloud requires write permissions. Check:
1. SQLiteCloud Dashboard → Your Database → Permissions
2. Ensure your connection string includes proper credentials
3. Verify API key has write access

### Check Connection String Format
Correct format:
```
sqlitecloud://username:password@host.sqlite.cloud:8860/database_name?apikey=YOUR_API_KEY
```

Common mistakes:
- Missing `?apikey=` parameter
- Wrong port (should be 8860)
- Incorrect hostname format

### Transaction Behavior
SQLiteCloud uses sequential execution. If you see:
- "Operation queue" errors
- Timeout errors
- Connection errors

This might indicate:
- Too many concurrent operations
- Network latency issues
- SQLiteCloud service issues

## Debugging Steps

### Step 1: Enable Detailed Logging
The code now includes extensive logging. Check Render logs for:
- `[DB-ADAPTER]` messages
- `[PUT]` messages
- Transaction start/commit/rollback messages

### Step 2: Test Direct Update
Try updating a record directly via SQLiteCloud dashboard to verify:
1. Database is writable
2. Your account has permissions
3. Data structure is correct

### Step 3: Compare Local vs Render
1. Test update locally - does it work?
2. If local works but Render doesn't:
   - Check DATABASE_URL differences
   - Check environment variables
   - Check network connectivity

### Step 4: Check SQLiteCloud Dashboard
1. Log into SQLiteCloud dashboard
2. Check connection logs
3. Verify database state
4. Check if updates are actually happening

## Next Steps

1. **Deploy latest changes** - Includes enhanced logging
2. **Monitor Render logs** - Watch for transaction messages
3. **Test update endpoint** - Try updating a record
4. **Check diagnostic endpoints** - Use `/api/db-test` and `/api/db-transaction-test`
5. **Verify in SQLiteCloud** - Check database directly

## If Still Not Working

1. **Check SQLiteCloud Status**: Visit SQLiteCloud dashboard
2. **Verify Connection**: Test connection string locally
3. **Check Permissions**: Ensure write access
4. **Review Logs**: Look for specific error messages
5. **Contact Support**: SQLiteCloud support or Render support

## Additional Resources

- SQLiteCloud Docs: https://docs.sqlitecloud.io/
- SQLiteCloud Node.js Driver: https://www.npmjs.com/package/@sqlitecloud/drivers
- Render Logs: Render Dashboard → Your Service → Logs
