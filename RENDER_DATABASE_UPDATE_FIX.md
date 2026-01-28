# Render Database Update Issue - Diagnosis & Fix

## Problem
Database updates are not persisting in Render deployment.

## Potential Causes

### 1. **DATABASE_URL Not Set in Render**
- **Check**: Go to Render Dashboard → Your Service → Environment tab
- **Verify**: `DATABASE_URL` is set correctly
- **For SQLiteCloud**: Should be `sqlitecloud://user:password@host.sqlite.cloud:8860/dbname?apikey=...`
- **For PostgreSQL**: Should be `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

### 2. **SQLiteCloud Transaction Issues**
SQLiteCloud transactions may need explicit handling. The fix includes:
- Using `BEGIN` instead of `BEGIN TRANSACTION`
- Added transaction logging to diagnose issues
- Ensuring all queries in transaction use the same Database object

### 3. **Auto-Commit Behavior**
SQLiteCloud has auto-commit enabled by default. When you call `BEGIN`, it should disable auto-commit until `COMMIT` or `ROLLBACK`.

## Fixes Applied

### ✅ Fixed `db_adapter.js` Transaction Handling
- Changed `BEGIN TRANSACTION` → `BEGIN` (SQLite standard)
- Added transaction logging for debugging
- Improved error handling with rollback logging

## How to Diagnose

### Step 1: Check Render Logs
1. Go to Render Dashboard → Your Service → Logs
2. Look for:
   - `✅ Connected to SQLiteCloud` or `✅ Connected to PostgreSQL`
   - `[DB-ADAPTER] SQLiteCloud transaction started`
   - `[DB-ADAPTER] SQLiteCloud transaction committed`
   - Any error messages about transactions

### Step 2: Test Database Connection
Add this endpoint to test connection:

```javascript
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await db.query('SELECT 1 as test');
    res.json({ 
      success: true, 
      dbType: db.getDBType(),
      test: result.rows[0],
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not Set'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      dbType: db.getDBType()
    });
  }
});
```

### Step 3: Test Transaction
Test if transactions work:

```javascript
app.get('/api/db-transaction-test', async (req, res) => {
  try {
    await db.transaction(async (query) => {
      // Test insert
      await query('INSERT INTO test_table (name) VALUES (?)', ['test']);
      // Test select
      const result = await query('SELECT * FROM test_table WHERE name = ?', ['test']);
      return result;
    });
    res.json({ success: true, message: 'Transaction test passed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Common Issues & Solutions

### Issue: "Database not initialized"
**Solution**: Ensure `db.initDatabase()` is called before server starts (already done in server.js:103)

### Issue: "No DATABASE_URL found"
**Solution**: Set `DATABASE_URL` environment variable in Render dashboard

### Issue: Updates appear to work but don't persist
**Possible Causes**:
1. Transaction not committing (check logs for commit messages)
2. Wrong database connection (check DATABASE_URL)
3. SQLiteCloud connection timeout (check connection string)

### Issue: SQLiteCloud "operation queue" errors
**Solution**: SQLiteCloud executes operations sequentially. If you see queue errors, reduce concurrent operations or add delays.

## Next Steps

1. **Deploy the fix**: Commit and push the updated `db_adapter.js`
2. **Check Render logs**: After deployment, monitor logs for transaction messages
3. **Test an update**: Try updating a project and check if it persists
4. **Verify in database**: Connect directly to your database and check if updates are there

## Additional Debugging

If issues persist, add more logging:

```javascript
// In db_adapter.js query function, add:
console.log('[DB-ADAPTER] Executing query:', sql.substring(0, 100));
console.log('[DB-ADAPTER] Params:', params);
console.log('[DB-ADAPTER] Result rowCount:', result.rowCount);
```

## Render Environment Variables Checklist

Ensure these are set in Render:
- ✅ `DATABASE_URL` - Your database connection string
- ✅ `JWT_SECRET` - Secret for JWT tokens
- ✅ `NODE_ENV` - Set to `production`
- ✅ `PORT` - Usually auto-set by Render (don't override)
