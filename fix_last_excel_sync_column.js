#!/usr/bin/env node

/**
 * Migration script to add missing last_excel_sync column to opps_monitoring table
 * This fixes the Google Drive sync error in production
 * 
 * Usage: node fix_last_excel_sync_column.js
 */

const { Client } = require('pg');

// Configuration - uses environment variables or defaults for local development
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || process.env.DATABASE_URL || 'cmrp_opportunities',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

// For production services like Render, use DATABASE_URL
if (process.env.DATABASE_URL) {
    // Parse DATABASE_URL for production deployment
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = url.port || 5432;
    dbConfig.database = url.pathname.slice(1);
    dbConfig.user = url.username;
    dbConfig.password = url.password;
    dbConfig.ssl = { rejectUnauthorized: false };
}

async function addLastExcelSyncColumn() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        
        console.log('🔍 Checking if last_excel_sync column exists...');
        
        // Check if column already exists
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'opps_monitoring' 
            AND column_name = 'last_excel_sync'
        `);
        
        if (columnCheck.rows.length > 0) {
            console.log('✅ Column last_excel_sync already exists. No migration needed.');
            return;
        }
        
        console.log('📝 Adding last_excel_sync column...');
        
        // Add the column
        await client.query(`
            ALTER TABLE opps_monitoring 
            ADD COLUMN last_excel_sync TIMESTAMP
        `);
        
        console.log('📊 Adding index for better performance...');
        
        // Add index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_opps_monitoring_last_excel_sync 
            ON opps_monitoring(last_excel_sync)
        `);
        
        // Add comment
        await client.query(`
            COMMENT ON COLUMN opps_monitoring.last_excel_sync 
            IS 'Timestamp of last sync from Excel/Google Drive file'
        `);
        
        console.log('✅ Migration completed successfully!');
        console.log('🚀 Google Drive sync should now work properly.');
        
        // Verify the column was added
        const verification = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'opps_monitoring' 
            AND column_name = 'last_excel_sync'
        `);
        
        if (verification.rows.length > 0) {
            const col = verification.rows[0];
            console.log(`📋 Verified: ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed.');
    }
}

// Run the migration
if (require.main === module) {
    console.log('🛠️  Starting last_excel_sync column migration...');
    addLastExcelSyncColumn()
        .then(() => {
            console.log('🎉 Migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { addLastExcelSyncColumn };