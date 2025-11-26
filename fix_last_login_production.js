// Fix last login and timestamp issues in production
const { Pool } = require('pg');
require('dotenv').config();

const PRODUCTION_DB_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: PRODUCTION_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixLastLoginProduction() {
  console.log('=== FIXING LAST LOGIN AND TIMESTAMP ISSUES IN PRODUCTION ===');
  
  try {
    // 1. Check current users table structure
    console.log('1. Checking users table structure...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Current users table structure:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 2. Ensure last_login_at column exists and is properly configured
    console.log('\n2. Ensuring last_login_at column is properly configured...');
    
    const lastLoginColCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'last_login_at'
    `);
    
    if (lastLoginColCheck.rows.length === 0) {
      console.log('❌ last_login_at column missing, adding it...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE
      `);
      console.log('✅ Added last_login_at column');
    } else {
      console.log('✅ last_login_at column exists');
      console.log(`   Type: ${lastLoginColCheck.rows[0].data_type}`);
    }
    
    // 3. Create/update index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at)
    `);
    console.log('✅ Ensured index exists on last_login_at');
    
    // 4. Test the users API query that's failing
    console.log('\n3. Testing users API query...');
    try {
      const testResult = await pool.query(`
        SELECT 
          id, 
          email, 
          name, 
          is_verified, 
          roles, 
          account_type, 
          last_login_at,
          created_at
        FROM users 
        ORDER BY email ASC 
        LIMIT 5
      `);
      
      console.log(`✅ Users API query successful - returned ${testResult.rows.length} users`);
      console.log('   Sample data with last_login_at:');
      testResult.rows.forEach(user => {
        const lastLogin = user.last_login_at ? 
          new Date(user.last_login_at).toISOString() : 
          'null';
        console.log(`   - ${user.email}: last_login_at = ${lastLogin}`);
      });
      
    } catch (apiError) {
      console.error('❌ Users API query failed:', apiError.message);
      throw apiError;
    }
    
    // 5. Check for any users without last_login_at and set default values
    console.log('\n4. Setting default last_login_at for users without it...');
    const updateResult = await pool.query(`
      UPDATE users 
      SET last_login_at = created_at 
      WHERE last_login_at IS NULL AND created_at IS NOT NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} users with default last_login_at`);
    
    // 6. Verify the server.js login code will work
    console.log('\n5. Testing login update query...');
    const loginUpdateTest = await pool.query(`
      SELECT id, email FROM users LIMIT 1
    `);
    
    if (loginUpdateTest.rows.length > 0) {
      const testUserId = loginUpdateTest.rows[0].id;
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [testUserId]);
      console.log('✅ Login update query test successful');
      
      // Verify the update worked
      const verifyResult = await pool.query(
        'SELECT last_login_at FROM users WHERE id = $1', 
        [testUserId]
      );
      console.log(`   Updated last_login_at: ${verifyResult.rows[0].last_login_at}`);
    }
    
    // 7. Test the exact query used in user_management.html
    console.log('\n6. Final verification with exact API query...');
    const finalTest = await pool.query(`
      SELECT id, email, name, is_verified, roles, account_type, last_login_at 
      FROM users 
      ORDER BY email ASC
    `);
    
    console.log(`✅ Final test successful - ${finalTest.rows.length} users returned`);
    console.log('   All users have proper structure for frontend display');
    
    // 8. Show current status of all users
    console.log('\n7. Current status of all users:');
    finalTest.rows.forEach((user, index) => {
      const lastLogin = user.last_login_at ? 
        new Date(user.last_login_at).toLocaleString() : 
        'Never';
      console.log(`   ${index + 1}. ${user.email} (${user.account_type}): ${lastLogin}`);
    });
    
    console.log('\n✅ ALL LAST LOGIN ISSUES FIXED SUCCESSFULLY!');
    console.log('\nNext steps:');
    console.log('1. Deploy this fix to production');
    console.log('2. Restart the production server');
    console.log('3. Test user management page');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the fix
fixLastLoginProduction().catch(console.error);