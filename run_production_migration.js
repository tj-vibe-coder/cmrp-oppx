const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production database connection
const DATABASE_URL = "postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require";

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function runMigration() {
    console.log('🔧 Starting production database migration for user management...');
    
    try {
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'fix_production_users_table.sql'), 'utf8');
        
        // Connect to database
        const client = await pool.connect();
        console.log('✅ Connected to production database');
        
        // Run the migration
        console.log('🚀 Running migration...');
        const result = await client.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        // Show the final users table state
        if (result.rows && result.rows.length > 0) {
            console.log('\n📊 Current users in the database:');
            console.table(result.rows);
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        
        if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('\n💡 The columns already exist or there was a schema issue.');
            console.log('Try checking the current table structure with:');
            console.log('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'users\';');
        }
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
runMigration();