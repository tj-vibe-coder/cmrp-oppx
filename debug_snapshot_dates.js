// Debug snapshot dates in database
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function debugSnapshotDates() {
    const client = await pool.connect();
    
    try {
        console.log('=== CUSTOM SNAPSHOTS RAW DATA ===');
        const customQuery = `
            SELECT 
                id,
                snapshot_date,
                snapshot_date::TEXT as snapshot_date_text,
                description,
                created_at,
                created_at::TEXT as created_at_text
            FROM custom_snapshots 
            ORDER BY id
        `;
        
        const customResult = await client.query(customQuery);
        customResult.rows.forEach(row => {
            console.log(`ID ${row.id}:`);
            console.log(`  snapshot_date: ${row.snapshot_date} (${row.snapshot_date_text})`);
            console.log(`  created_at: ${row.created_at} (${row.created_at_text})`);
            console.log(`  description: ${row.description}`);
            console.log('');
        });

        console.log('=== API QUERY RESULT ===');
        const apiQuery = `
            SELECT DISTINCT 
                snapshot_date,
                'custom' as snapshot_type,
                created_at,
                COALESCE(description, CONCAT('Custom - ', snapshot_date)) as description
            FROM custom_snapshots
            ORDER BY snapshot_date DESC, created_at DESC
        `;
        
        const apiResult = await client.query(apiQuery);
        apiResult.rows.forEach(row => {
            console.log(`snapshot_date: ${row.snapshot_date}`);
            console.log(`description: ${row.description}`);
            console.log(`created_at: ${row.created_at}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error debugging snapshot dates:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

debugSnapshotDates();