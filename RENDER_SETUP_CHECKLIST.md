# Render Setup Checklist - SQLiteCloud Database Updates

## ✅ Your Connection String Format
Your SQLiteCloud connection string looks correct:
```
sqlitecloud://cwv6rvpmdk.g2.sqlite.cloud:8860/cmrp-oppx?apikey=GFwhrD0kqA8NlZxgejGAPyaVRhwpLq7NCAFbqWQjW24
```

## Checklist for Render Environment Variables

### 1. DATABASE_URL ✅
- **Location**: Render Dashboard → Your Service → Environment
- **Value**: `sqlitecloud://cwv6rvpmdk.g2.sqlite.cloud:8860/cmrp-oppx?apikey=GFwhrD0kqA8NlZxgejGAPyaVRhwpLq7NCAFbqWQjW24`
- **Status**: ✅ Set correctly

### 2. JWT_SECRET
- **Required**: Yes
- **Example**: `your-very-secure-random-string-here`
- **Check**: Make sure it's set in Render

### 3. NODE_ENV
- **Required**: Yes (for production)
- **Value**: `production`
- **Check**: Should be set to `production` in Render

### 4. PORT
- **Required**: No (Render sets this automatically)
- **Note**: Don't override this unless necessary

## After Deployment - Diagnostic Steps

### Step 1: Check Render Logs
1. Go to Render Dashboard → Your Service → Logs
2. Look for these messages on startup:
   - `✅ Connected to SQLiteCloud`
   - `[DB-ADAPTER] SQLiteCloud connection test passed`
   - `✅ Database initialized successfully`

**If you see errors**, check:
- Connection string format
- Network connectivity
- SQLiteCloud service status

### Step 2: Test Database Connection
Visit: `https://your-app.onrender.com/api/db-test`

**Expected Response:**
```json
{
  "success": true,
  "dbType": "sqlitecloud",
  "test": { "test": 1, "current_time": "..." },
  "connection": {
    "type": "SQLiteCloud",
    "host": "cwv6rvpmdk.g2.sqlite.cloud",
    "database": "cmrp-oppx",
    "hasApiKey": true
  },
  "databaseUrl": "Set"
}
```

**If this fails:**
- Check DATABASE_URL in Render
- Verify SQLiteCloud service is running
- Check network connectivity

### Step 3: Test Transaction
Visit: `https://your-app.onrender.com/api/db-transaction-test`

**Expected Response:**
```json
{
  "success": true,
  "message": "Transaction test completed",
  "updatePersisted": true,
  "testValue": "test_1234567890"
}
```

**If `updatePersisted: false`:**
- Transaction is not committing
- Check Render logs for transaction errors
- Verify SQLiteCloud write permissions

### Step 4: Try Updating a Record
1. Update a project in your app
2. Check Render logs for:
   - `[DB-ADAPTER] ✅ SQLiteCloud transaction started`
   - `[PUT] Update result: { rowCount: 1 }`
   - `✅ Update verified - all fields match`
   - `[DB-ADAPTER] ✅ SQLiteCloud transaction committed successfully`

**If you see:**
- `⚠️ UPDATE returned 0 rows affected` → Check UID exists, verify WHERE clause
- `❌ Update verification failed` → Transaction might be rolling back
- `[DB-ADAPTER] SQLiteCloud transaction rolled back` → Check error message

## Common Issues & Solutions

### Issue: "Database not initialized"
**Solution**: Check Render logs for initialization errors. Verify DATABASE_URL is set correctly.

### Issue: "Connection test failed"
**Solution**: 
- Verify SQLiteCloud service is accessible
- Check connection string format
- Verify API key is correct

### Issue: "Transaction test failed"
**Solution**:
- Check SQLiteCloud write permissions
- Verify API key has write access
- Check Render logs for specific error

### Issue: "Updates don't persist"
**Possible Causes**:
1. **Transaction not committing** → Check logs for commit messages
2. **Wrong database** → Verify DATABASE_URL points to correct database
3. **Read-only connection** → Check SQLiteCloud permissions
4. **Connection timeout** → Check SQLiteCloud service status

## SQLiteCloud Dashboard Checks

1. **Log into SQLiteCloud Dashboard**
2. **Check Database**: Verify `cmrp-oppx` database exists
3. **Check Permissions**: Ensure API key has write access
4. **Check Connections**: See if Render is connecting successfully
5. **Check Data**: Verify if updates are actually happening

## Next Steps

1. ✅ **Deploy latest changes** (already pushed)
2. ⏳ **Wait for Render to deploy** (2-3 minutes)
3. 🔍 **Check Render logs** for connection messages
4. 🧪 **Test `/api/db-test` endpoint**
5. 🧪 **Test `/api/db-transaction-test` endpoint**
6. 📝 **Try updating a record** and check logs
7. ✅ **Verify update persisted** in SQLiteCloud dashboard

## If Still Not Working

1. **Check Render Logs**: Look for specific error messages
2. **Check SQLiteCloud Dashboard**: Verify database state
3. **Test Connection Locally**: Try connecting with same DATABASE_URL locally
4. **Contact Support**: SQLiteCloud support or Render support

## Quick Test Commands

After deployment, you can test with curl:

```bash
# Test connection
curl https://your-app.onrender.com/api/db-test

# Test transaction
curl https://your-app.onrender.com/api/db-transaction-test
```
