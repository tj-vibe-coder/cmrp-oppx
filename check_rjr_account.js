// Check RJR user account status and permissions
const { Pool } = require('pg');
require('dotenv').config();

const PRODUCTION_DB_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: PRODUCTION_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkRJRAccount() {
  console.log('=== CHECKING RJR USER ACCOUNT ===');
  
  try {
    // Look for RJR-related accounts
    console.log('1. Searching for RJR-related accounts...');
    const rjrResults = await pool.query(`
      SELECT id, email, name, account_type, roles, is_verified, created_at
      FROM users 
      WHERE LOWER(email) LIKE '%reuel%' 
         OR LOWER(email) LIKE '%rjr%' 
         OR LOWER(name) LIKE '%reuel%'
         OR LOWER(email) LIKE '%rivera%'
      ORDER BY created_at DESC
    `);
    
    if (rjrResults.rows.length === 0) {
      console.log('❌ No RJR/Reuel accounts found');
      return;
    }
    
    console.log(`✅ Found ${rjrResults.rows.length} RJR/Reuel-related accounts:`);
    rjrResults.rows.forEach((user, index) => {
      console.log(`\n${index + 1}. Account Details:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Account Type: ${user.account_type}`);
      console.log(`   Roles: ${JSON.stringify(user.roles)}`);
      console.log(`   Verified: ${user.is_verified}`);
      console.log(`   Created: ${user.created_at}`);
      
      // Check if this user has admin access
      const hasAdminAccess = user.account_type === 'Admin' || 
                            (Array.isArray(user.roles) && user.roles.includes('Admin'));
      console.log(`   🔑 Admin Access: ${hasAdminAccess ? '✅ YES' : '❌ NO'}`);
    });
    
    // Check all admin users
    console.log('\n2. All Admin Users in Database:');
    const adminResults = await pool.query(`
      SELECT id, email, name, account_type, roles
      FROM users 
      WHERE account_type = 'Admin' OR 'Admin' = ANY(roles)
      ORDER BY email
    `);
    
    adminResults.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.account_type}) - Roles: ${JSON.stringify(user.roles)}`);
    });
    
    // Test the exact query that the API uses
    console.log('\n3. Testing User Management API Query...');
    try {
      const apiQuery = await pool.query(
        'SELECT id, email, name, is_verified, roles, account_type, last_login_at FROM users ORDER BY email ASC'
      );
      console.log(`✅ API query successful - returned ${apiQuery.rows.length} users`);
      
      // Show first few users to verify data format
      console.log('   Sample users:');
      apiQuery.rows.slice(0, 3).forEach(user => {
        console.log(`   - ${user.email}: ${user.account_type} (${JSON.stringify(user.roles)})`);
      });
      
    } catch (error) {
      console.log(`❌ API query failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Account check failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run check
checkRJRAccount().catch(console.error);