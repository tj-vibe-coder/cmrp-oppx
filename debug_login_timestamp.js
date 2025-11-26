// Debug login timestamp issue for RJR user
const { Pool } = require('pg');
require('dotenv').config();

const PRODUCTION_DB_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: PRODUCTION_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function debugLoginTimestamp() {
  console.log('=== DEBUGGING LOGIN TIMESTAMP ISSUE ===');
  console.log('Current Manila time:', new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }));
  
  try {
    // 1. Check RJR user current status
    console.log('\n1. Checking RJR user current status...');
    const rjrCheck = await pool.query(`
      SELECT 
        email, 
        name, 
        last_login_at,
        created_at,
        account_type,
        EXTRACT(TIMEZONE FROM last_login_at) as timezone_offset
      FROM users 
      WHERE email LIKE '%reuel%' OR email LIKE '%rjr%' OR name LIKE '%RJR%'
      ORDER BY email
    `);
    
    console.log('RJR user accounts found:');
    rjrCheck.rows.forEach(user => {
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Account Type: ${user.account_type}`);
      console.log(`  Created: ${user.created_at}`);
      console.log(`  Last Login: ${user.last_login_at}`);
      console.log(`  Timezone Offset: ${user.timezone_offset}`);
      console.log('  ---');
    });
    
    // 2. Check database timezone settings
    console.log('\n2. Checking database timezone settings...');
    const timezoneCheck = await pool.query(`
      SELECT 
        current_setting('timezone') as current_timezone,
        NOW() as current_db_time,
        NOW() AT TIME ZONE 'Asia/Manila' as manila_time
    `);
    
    console.log('Database timezone info:');
    console.log(`  Current timezone: ${timezoneCheck.rows[0].current_timezone}`);
    console.log(`  DB current time: ${timezoneCheck.rows[0].current_db_time}`);
    console.log(`  Manila time: ${timezoneCheck.rows[0].manila_time}`);
    
    // 3. Test updating last_login_at with proper timezone
    console.log('\n3. Testing last_login_at update...');
    
    // Find the main RJR account
    const mainRjrQuery = await pool.query(`
      SELECT id, email FROM users 
      WHERE email = 'reuel.rivera@cmrpautomation.com' 
      OR email = 'rivera.reuel@gmail.com'
      LIMIT 1
    `);
    
    if (mainRjrQuery.rows.length > 0) {
      const rjrUser = mainRjrQuery.rows[0];
      console.log(`  Found RJR account: ${rjrUser.email} (ID: ${rjrUser.id})`);
      
      // Update with current Manila time
      console.log('  Updating last_login_at to current Manila time...');
      await pool.query(`
        UPDATE users 
        SET last_login_at = NOW() AT TIME ZONE 'Asia/Manila'
        WHERE id = $1
      `, [rjrUser.id]);
      
      // Verify the update
      const verifyUpdate = await pool.query(`
        SELECT 
          email,
          last_login_at,
          last_login_at AT TIME ZONE 'Asia/Manila' as manila_last_login
        FROM users 
        WHERE id = $1
      `, [rjrUser.id]);
      
      console.log('  Update result:');
      console.log(`    Email: ${verifyUpdate.rows[0].email}`);
      console.log(`    Last login (UTC): ${verifyUpdate.rows[0].last_login_at}`);
      console.log(`    Last login (Manila): ${verifyUpdate.rows[0].manila_last_login}`);
      
    } else {
      console.log('  ❌ RJR account not found!');
    }
    
    // 4. Check if there are multiple login endpoints
    console.log('\n4. Recommendations:');
    console.log('  - Ensure you are hitting the production API endpoint, not development mock');
    console.log('  - Check that USE_MOCK_DATA environment variable is set to false in production');
    console.log('  - The login endpoint should update last_login_at with Manila timezone');
    
    // 5. Show the correct query to use in server.js
    console.log('\n5. Correct query for server.js login endpoint:');
    console.log(`
    // Instead of:
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
    
    // Use this for Manila timezone:
    await pool.query(\`
      UPDATE users 
      SET last_login_at = NOW() AT TIME ZONE 'Asia/Manila'
      WHERE id = $1
    \`, [user.id]);
    `);
    
    console.log('\n✅ Debug completed. Check the recommendations above.');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the debug
debugLoginTimestamp().catch(console.error);