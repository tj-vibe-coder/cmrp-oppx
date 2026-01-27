# Invalid Credentials - Troubleshooting Guide

## Common Causes

The "Invalid credentials" error can occur for several reasons:

### 1. **User Not Found** ❌
- The email address doesn't exist in the database
- Email case mismatch (though the code normalizes to lowercase)
- **Solution**: Verify the email exists or create the user account

### 2. **Missing Password Hash** ❌
- The user exists but has no `password_hash` in the database
- This can happen if a user was created without a password
- **Solution**: User needs to reset their password via admin panel

### 3. **Invalid Password Hash Format** ⚠️
- The `password_hash` exists but is not in bcrypt format
- This can happen if data was migrated incorrectly
- **Solution**: User needs to reset their password

### 4. **Incorrect Password** ❌
- The password entered doesn't match the stored hash
- **Solution**: Use the correct password or reset it

### 5. **Database Connection Issues** ⚠️
- Database not properly initialized
- Connection timeout or error
- **Solution**: Check database connection and `DATABASE_URL` environment variable

## Diagnostic Tools

### Run the Diagnostic Script

```bash
# Check if user exists and has valid password hash
node diagnose_login_issue.js user@example.com

# Test password matching
node diagnose_login_issue.js user@example.com password123
```

The script will:
- ✅ Check database connection
- ✅ Verify user exists
- ✅ Check if password_hash exists
- ✅ Validate password hash format
- ✅ Test password matching (if password provided)

## Improved Error Handling

The login handler now includes:
- ✅ Validation that password_hash exists
- ✅ Validation of password hash format
- ✅ Better error logging for debugging
- ✅ Proper error handling for bcrypt comparison

## Common Solutions

### Fix Missing Password Hash

If a user has no password hash, an admin can:

1. **Via Admin Panel**: Update the user and set a new password
2. **Via API**: Use the `/api/users/:id` PUT endpoint with a password
3. **Via Database**: Directly update (not recommended, use API instead)

### Reset User Password

```javascript
// Via API (requires admin token)
PUT /api/users/:id
{
  "email": "user@example.com",
  "password": "newpassword123",
  "roles": ["User"],
  "accountType": "User"
}
```

### Check Database

```sql
-- Check if user exists
SELECT id, email, name, 
       CASE WHEN password_hash IS NULL THEN 'MISSING' 
            WHEN password_hash = '' THEN 'EMPTY'
            WHEN password_hash NOT LIKE '$2%' THEN 'INVALID FORMAT'
            ELSE 'OK' END as hash_status
FROM users 
WHERE email = 'user@example.com';

-- Check all users with missing/invalid password hashes
SELECT id, email, name,
       CASE WHEN password_hash IS NULL THEN 'MISSING' 
            WHEN password_hash = '' THEN 'EMPTY'
            WHEN password_hash NOT LIKE '$2%' THEN 'INVALID FORMAT'
            ELSE 'OK' END as hash_status
FROM users
WHERE password_hash IS NULL 
   OR password_hash = '' 
   OR password_hash NOT LIKE '$2%';
```

## Environment Variables

Make sure these are set correctly:

```bash
DATABASE_URL=postgresql://...  # or sqlite://... or sqlitecloud://...
JWT_SECRET=your-secret-key
USE_MOCK_DATA=false  # Set to true only for development
```

## Testing

After fixing issues, test login:

1. Use the diagnostic script to verify user status
2. Try logging in via the web interface
3. Check server logs for detailed error messages

## Server Logs

The improved login handler now logs:
- When a user is not found
- When password_hash is missing
- When password_hash format is invalid
- When password comparison fails
- Successful logins

Check server console output for these messages to diagnose issues.
