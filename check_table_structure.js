const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function checkTableStructure() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking opps_monitoring table structure...');

        const query = `
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'opps_monitoring'
            ORDER BY ordinal_position
        `;

        const result = await client.query(query);
        console.log(`📊 Found ${result.rows.length} columns:`);

        result.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

    } catch (error) {
        console.error('❌ Error checking table structure:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkTableStructure().catch(console.error);
