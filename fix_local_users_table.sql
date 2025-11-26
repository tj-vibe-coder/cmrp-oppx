-- Fix local development users table for user management functionality
-- This script adds missing columns and sets up proper admin access

-- Add roles column (JSONB array to store multiple roles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- Add account_type column (Admin or User)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'User';

-- Add last_login_at column for tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- Update existing users to have at least one role if they don't have any
UPDATE users 
SET roles = '["User"]'::jsonb 
WHERE roles IS NULL OR roles = '[]'::jsonb;

-- Set the first user (likely the admin) to have Admin role and account type
-- Update the user with the admin email to be an admin
UPDATE users 
SET 
    account_type = 'Admin',
    roles = '["Admin", "DS", "SE"]'::jsonb
WHERE email ILIKE '%admin%' OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- If no admin users found, make the first user an admin
UPDATE users 
SET 
    account_type = 'Admin',
    roles = '["Admin", "DS", "SE"]'::jsonb
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM users WHERE account_type = 'Admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);

-- Set last_login_at for existing users based on created_at
UPDATE users 
SET last_login_at = created_at 
WHERE last_login_at IS NULL;

-- Verify the changes
SELECT 
    id,
    email, 
    name, 
    roles, 
    account_type, 
    is_verified,
    last_login_at,
    created_at
FROM users 
ORDER BY created_at ASC;