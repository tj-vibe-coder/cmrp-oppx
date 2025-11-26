// Check all snapshots in the database
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function checkSnapshots() {
    const client = await pool.connect();
    
    try {
        // Check custom_snapshots table
        console.log('=== CUSTOM SNAPSHOTS ===');
        const customQuery = `
            SELECT id, snapshot_date, description, total_opportunities, submitted_count, 
                   created_at, is_manual
            FROM custom_snapshots 
            ORDER BY snapshot_date DESC
        `;
        
        const customResult = await client.query(customQuery);
        console.log(`Found ${customResult.rows.length} custom snapshots:`);
        customResult.rows.forEach(row => {
            console.log(`- ${row.snapshot_date.toISOString().split('T')[0]}: ${row.description || 'No description'} (ID: ${row.id}, Manual: ${row.is_manual})`);
        });

        // Check dashboard_snapshots table as well
        console.log('\n=== DASHBOARD SNAPSHOTS ===');
        const dashQuery = `
            SELECT id, snapshot_date, snapshot_type, total_opportunities, submitted_count, created_at
            FROM dashboard_snapshots 
            ORDER BY snapshot_date DESC
            LIMIT 10
        `;
        
        const dashResult = await client.query(dashQuery);
        console.log(`Found ${dashResult.rows.length} dashboard snapshots (showing latest 10):`);
        dashResult.rows.forEach(row => {
            console.log(`- ${row.snapshot_date.toISOString().split('T')[0]}: ${row.snapshot_type} (ID: ${row.id})`);
        });

    } catch (error) {
        console.error('Error checking snapshots:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkSnapshots();