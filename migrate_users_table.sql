-- Add missing columns to users table for user management functionality
-- Run this script to fix the user management table display and functionality

-- Add roles column (JSONB array to store multiple roles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- Add account_type column (Admin or User)
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'User';

-- Update existing users to have at least one role if they don't have any
UPDATE users 
SET roles = '["User"]'::jsonb 
WHERE roles IS NULL OR roles = '[]'::jsonb;

-- Ensure any existing admin users have proper account_type
-- This is a safe update that won't affect existing data
UPDATE users 
SET account_type = 'Admin' 
WHERE roles::text LIKE '%Admin%' AND account_type != 'Admin';

-- Create index for better performance on queries
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);

-- Verify the changes
SELECT 
    email, 
    name, 
    roles, 
    account_type, 
    is_verified 
FROM users 
ORDER BY email;
