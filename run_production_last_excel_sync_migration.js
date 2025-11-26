/**
 * Production Migration Script: Add last_excel_sync column to opps_monitoring table
 * 
 * This script connects to the production database and adds the missing last_excel_sync column
 * that is required for Google Drive sync functionality.
 * 
 * Usage: node run_production_last_excel_sync_migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');

async function runMigration() {
    // Use production database URL
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🚀 Starting last_excel_sync column migration for production...');
        console.log('🔌 Connecting to production database...');
        
        const client = await pool.connect();
        
        try {
            // Check if column already exists
            console.log('🔍 Checking if last_excel_sync column exists...');
            const columnCheck = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'opps_monitoring' 
                AND column_name = 'last_excel_sync'
            `);

            if (columnCheck.rows.length > 0) {
                console.log('✅ Column last_excel_sync already exists. No migration needed.');
                console.log('📊 Column details:', columnCheck.rows[0]);
                return;
            }

            // Add the missing column
            console.log('📝 Adding last_excel_sync column...');
            
            await client.query(`
                ALTER TABLE opps_monitoring 
                ADD COLUMN last_excel_sync TIMESTAMP
            `);
            
            console.log('📝 Creating index for better performance...');
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_opps_monitoring_last_excel_sync 
                ON opps_monitoring(last_excel_sync)
            `);
            
            console.log('📝 Adding documentation comment...');
            await client.query(`
                COMMENT ON COLUMN opps_monitoring.last_excel_sync 
                IS 'Timestamp of last sync from Excel/Google Drive file'
            `);

            // Verify the migration was successful
            console.log('🔍 Verifying migration...');
            const verifyResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'opps_monitoring' 
                AND column_name = 'last_excel_sync'
            `);

            if (verifyResult.rows.length > 0) {
                console.log('✅ Migration completed successfully!');
                console.log('📊 New column details:', verifyResult.rows[0]);
                
                // Check index was created
                const indexCheck = await client.query(`
                    SELECT indexname, indexdef
                    FROM pg_indexes 
                    WHERE tablename = 'opps_monitoring' 
                    AND indexname = 'idx_opps_monitoring_last_excel_sync'
                `);
                
                if (indexCheck.rows.length > 0) {
                    console.log('✅ Index created successfully');
                } else {
                    console.log('⚠️  Index may not have been created');
                }
            } else {
                throw new Error('Migration verification failed - column was not created');
            }

        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    console.log('🛠️  Starting last_excel_sync column migration...');
    runMigration()
        .then(() => {
            console.log('🎉 Migration process completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration process failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigration };