// Check custom_snapshots table schema
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function checkTableSchema() {
    const client = await pool.connect();
    
    try {
        // Check column information for custom_snapshots table
        const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'custom_snapshots'
            ORDER BY ordinal_position;
        `;
        
        const result = await client.query(schemaQuery);
        
        console.log('custom_snapshots table schema:');
        console.log('=====================================');
        result.rows.forEach(col => {
            console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });
        
    } catch (error) {
        console.error('Error checking table schema:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTableSchema();