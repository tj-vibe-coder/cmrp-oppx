const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-Southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function fixToCorrectTotal() {
  const client = await pool.connect();
  
  try {
    console.log('Correcting total_opportunities from 1125 to 530...');
    
    // Update only the total_opportunities field to 530
    await client.query(`
      UPDATE dashboard_snapshots 
      SET total_opportunities = 530
      WHERE snapshot_type = 'weekly';
    `);
    
    console.log('Fixed! Now the dashboard should show:');
    console.log('542 (actual records) - 530 (snapshot total) = +12');
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixToCorrectTotal();