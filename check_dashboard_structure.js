const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function checkDashboardStructure() {
  const client = await pool.connect();
  
  try {
    console.log('Checking dashboard_snapshots table structure...\n');
    
    // Get all columns
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'dashboard_snapshots'
      ORDER BY ordinal_position;
    `);
    
    console.log('Available columns in dashboard_snapshots:');
    columns.rows.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    // Show current data to see what we're working with
    console.log('\nCurrent weekly snapshot data:');
    const currentData = await client.query(`
      SELECT * FROM dashboard_snapshots 
      WHERE snapshot_type = 'weekly' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (currentData.rows.length > 0) {
      const data = currentData.rows[0];
      Object.keys(data).forEach(key => {
        if (key.includes('inactive') || key.includes('amount')) {
          console.log(`${key}: ${data[key]}`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error checking structure:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDashboardStructure()
  .then(() => {
    console.log('\nStructure check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });