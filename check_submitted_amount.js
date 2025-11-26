const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function checkSubmittedAmount() {
  const client = await pool.connect();
  
  try {
    console.log('Checking submitted amounts...\n');
    
    // Get current snapshot data
    const snapshot = await client.query(`
      SELECT submitted_count, submitted_amount 
      FROM dashboard_snapshots 
      WHERE snapshot_type = 'weekly' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (snapshot.rows.length > 0) {
      console.log('Current weekly snapshot in dashboard_snapshots:');
      console.log(`- Submitted count: ${snapshot.rows[0].submitted_count}`);
      console.log(`- Submitted amount: ₱${parseFloat(snapshot.rows[0].submitted_amount).toLocaleString()}`);
    }
    
    // Get actual submitted data from opps_monitoring
    const actualSubmitted = await client.query(`
      SELECT 
        COUNT(*) as count,
        SUM(CASE WHEN final_amt IS NOT NULL AND final_amt > 0 THEN final_amt ELSE 0 END) as total_amount
      FROM opps_monitoring 
      WHERE status = 'Submitted'
    `);
    
    console.log('\nActual "Submitted" from opps_monitoring table:');
    console.log(`- Count: ${actualSubmitted.rows[0].count}`);
    console.log(`- Total amount: ₱${parseFloat(actualSubmitted.rows[0].total_amount || 0).toLocaleString()}`);
    
    // Your original data
    console.log('\nYour provided weekly snapshot data:');
    console.log('- Submitted count: 330');
    console.log('- Submitted amount: ₱429,914,307.84');
    
    // Compare amounts
    const snapshotAmount = parseFloat(snapshot.rows[0].submitted_amount);
    const actualAmount = parseFloat(actualSubmitted.rows[0].total_amount || 0);
    const expectedAmount = 429914307.84;
    
    console.log('\nAmount comparison:');
    console.log(`- Dashboard snapshot: ₱${snapshotAmount.toLocaleString()}`);
    console.log(`- Actual database: ₱${actualAmount.toLocaleString()}`);
    console.log(`- Expected (your data): ₱${expectedAmount.toLocaleString()}`);
    console.log(`- Difference (Actual - Snapshot): ₱${(actualAmount - snapshotAmount).toLocaleString()}`);
    
  } catch (error) {
    console.error('Error checking submitted amount:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSubmittedAmount()
  .then(() => {
    console.log('\nSubmitted amount check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Check failed:', error);
    process.exit(1);
  });