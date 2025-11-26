const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function countRows() {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT COUNT(*) FROM opps_monitoring');
    console.log(`Total rows in opps_monitoring table: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error counting rows:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

countRows()
  .then(() => {
    console.log('Row count completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Row count failed:', error);
    process.exit(1);
  });