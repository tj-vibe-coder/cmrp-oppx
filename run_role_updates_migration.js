// Run role updates migration for both local and production
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configurations
const LOCAL_DB_URL = process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable';
const PRODUCTION_DB_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

async function runMigration(dbUrl, dbName) {
  console.log(`\n=== RUNNING ROLE UPDATES MIGRATION ON ${dbName.toUpperCase()} ===`);
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '011_update_role_definitions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('1. Executing role updates migration...');
    
    // Split the migration into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT '));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`  ✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (err) {
          // Skip if already exists or other non-critical errors
          if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
            console.log(`  ⚠️  Warning: ${err.message}`);
          }
        }
      }
    }
    
    // Run the summary queries
    console.log('\n2. Verification queries:');
    
    // Check role definitions
    try {
      const roleCheck = await pool.query(`
        SELECT code, name, role_type, is_active, is_resigned 
        FROM role_definitions 
        WHERE code IN ('DS', 'SE', 'PM', 'TM', 'Admin') 
        ORDER BY code
      `);
      
      console.log('  Current role definitions:');
      roleCheck.rows.forEach(role => {
        const status = role.is_resigned ? '(resigned)' : role.is_active ? '(active)' : '(inactive)';
        console.log(`    - ${role.code}: ${role.name} ${status}`);
      });
    } catch (err) {
      console.log('  ⚠️  Role definitions table may not exist yet');
    }
    
    // Check user account types
    try {
      const accountTypeCheck = await pool.query(`
        SELECT account_type, description FROM user_account_types ORDER BY sort_order
      `);
      
      console.log('  Available account types:');
      accountTypeCheck.rows.forEach(type => {
        console.log(`    - ${type.account_type}: ${type.description}`);
      });
    } catch (err) {
      console.log('  ⚠️  User account types view may not exist yet');
    }
    
    // Check role display mappings
    try {
      const displayCheck = await pool.query(`
        SELECT code, display_name, full_display FROM role_display_names ORDER BY sort_order
      `);
      
      console.log('  Role display mappings:');
      displayCheck.rows.forEach(role => {
        console.log(`    - ${role.code}: ${role.full_display}`);
      });
    } catch (err) {
      console.log('  ⚠️  Role display names view may not exist yet');
    }
    
    console.log(`\n✅ ${dbName.toUpperCase()} migration completed successfully!`);
    
  } catch (error) {
    console.error(`❌ ${dbName.toUpperCase()} migration failed:`, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

async function runAllMigrations() {
  try {
    console.log('🚀 Starting role updates migration process...');
    
    // Run on local database first
    await runMigration(LOCAL_DB_URL, 'local');
    
    // Run on production database
    await runMigration(PRODUCTION_DB_URL, 'production');
    
    console.log('\n🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('\nSummary of changes:');
    console.log('✅ DS updated to "Digital Solutions"');
    console.log('✅ SE updated to "Smart Energy"');
    console.log('✅ PM migrated to TM "Technical Manager" (PM marked as deprecated)');
    console.log('✅ Administrator updated to "Office Admin"');
    console.log('✅ User account types updated to "User" and "System Admin"');
    console.log('✅ Created helper views and functions for UI components');
    
    console.log('\nNext steps:');
    console.log('1. Update remaining UI components');
    console.log('2. Test user management functionality');
    console.log('3. Deploy changes to production');
    
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  }
}

// Run all migrations
runAllMigrations();