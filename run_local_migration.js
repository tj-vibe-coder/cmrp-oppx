const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Local development database connection
const DATABASE_URL = "postgresql://localhost:5432/cmrp_opps_db";

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function runMigration() {
    console.log('🔧 Starting local development database migration for user management...');
    
    try {
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'fix_local_admin_access.sql'), 'utf8');
        
        // Connect to database
        const client = await pool.connect();
        console.log('✅ Connected to local development database');
        
        // Run the migration
        console.log('🚀 Running migration...');
        const result = await client.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        // Show the final users table state
        if (result.rows && result.rows.length > 0) {
            console.log('\n📊 Current users in the local database:');
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
        
        if (error.message.includes('database') && error.message.includes('does not exist')) {
            console.log('\n💡 The database "cmrp_opps_db" does not exist.');
            console.log('Create it first with: createdb cmrp_opps_db');
        }
        
        if (error.message.includes('connection')) {
            console.log('\n💡 Make sure PostgreSQL is running locally.');
            console.log('Start it with: brew services start postgresql');
        }
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
runMigration();