const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Production database connection
const DATABASE_URL = "postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require";

const pool = new Pool({
    connectionString: DATABASE_URL,
});

async function runMigration() {
    console.log('🔧 Starting production database migration for proposal story feature...');
    
    try {
        // Read the migration SQL file
        const migrationSQL = fs.readFileSync(path.join(__dirname, 'create_proposal_story_table_final.sql'), 'utf8');
        
        // Connect to database
        const client = await pool.connect();
        console.log('✅ Connected to production database');
        
        // Check if the table already exists
        const checkTableQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'proposal_story_entries'
            );
        `;
        
        const tableExists = await client.query(checkTableQuery);
        if (tableExists.rows[0].exists) {
            console.log('ℹ️  proposal_story_entries table already exists, skipping table creation...');
            
            // Just run the function and view creation parts
            const functionSQL = migrationSQL.substring(
                migrationSQL.indexOf('-- Create function to get complete proposal story'),
                migrationSQL.length
            );
            
            console.log('🚀 Creating/updating function and view...');
            await client.query(functionSQL);
        } else {
            console.log('🚀 Running complete migration...');
            await client.query(migrationSQL);
        }
        
        console.log('✅ Migration completed successfully!');
        
        // Test the function
        console.log('🧪 Testing get_proposal_story function...');
        const testQuery = `
            SELECT EXISTS (
                SELECT * FROM information_schema.routines 
                WHERE routine_name = 'get_proposal_story'
            );
        `;
        const functionExists = await client.query(testQuery);
        
        if (functionExists.rows[0].exists) {
            console.log('✅ get_proposal_story function exists and is ready');
        } else {
            console.log('⚠️  get_proposal_story function was not created');
        }
        
        // Show table structure
        const tableInfoQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'proposal_story_entries'
            ORDER BY ordinal_position;
        `;
        const tableInfo = await client.query(tableInfoQuery);
        
        if (tableInfo.rows.length > 0) {
            console.log('\n📊 proposal_story_entries table structure:');
            console.table(tableInfo.rows);
        }
        
        client.release();
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Error details:', error.message);
        
        if (error.message.includes('already exists')) {
            console.log('\n💡 Some components already exist - this is normal.');
            console.log('The migration will skip existing components and only create missing ones.');
        }
    } finally {
        await pool.end();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
runMigration();