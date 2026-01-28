/**
 * Run migration 014: Add awarded projects sync support
 * This adds the synced_to_other_app column and creates the awarded_projects view
 */

require('dotenv').config();
const db = require('./db_adapter');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🌩️  Running Migration 014: Add awarded projects sync support\n');
    
    // Initialize database
    await db.initDatabase();
    console.log('✅ Database initialized\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '014_add_awarded_projects_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await db.query(stmt);
        
        // Extract what was created
        if (stmt.toUpperCase().includes('ALTER TABLE')) {
          console.log(`  ✅ Added column: synced_to_other_app`);
        } else if (stmt.toUpperCase().includes('CREATE INDEX')) {
          const match = stmt.match(/CREATE INDEX.*?ON\s+(\w+)/i);
          console.log(`  ✅ Created index: ${match ? match[1] : 'index'}`);
        } else if (stmt.toUpperCase().includes('CREATE VIEW')) {
          const match = stmt.match(/CREATE VIEW.*?(\w+)/i);
          console.log(`  ✅ Created view: ${match ? match[1] : 'view'}`);
        } else {
          console.log(`  ✅ Executed statement ${i + 1}`);
        }
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`  ⏭️  Statement ${i + 1} already applied (skipping)`);
        } else {
          console.error(`  ❌ Error executing statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('\n✅ Migration 014 completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Your other app can now query: GET /api/awarded-projects');
    console.log('2. Or query the database view directly: SELECT * FROM awarded_projects');
    console.log('3. When your other app fetches projects, call: POST /api/awarded-projects/mark-synced');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runMigration();
