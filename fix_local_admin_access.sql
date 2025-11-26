-- Fix local development database admin access
-- This script creates an admin user from existing users

-- Update the first user or a user with admin-like email to have Admin access
UPDATE users 
SET 
    account_type = 'Admin',
    roles = ARRAY['Admin', 'DS', 'SE']::text[]
WHERE email ILIKE '%admin%' 
   OR email ILIKE '%reuel%' 
   OR id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);

-- If no admin users found, make the first user an admin
UPDATE users 
SET 
    account_type = 'Admin',
    roles = ARRAY['Admin', 'DS', 'SE']::text[]
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
AND NOT EXISTS (SELECT 1 FROM users WHERE account_type = 'Admin');

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