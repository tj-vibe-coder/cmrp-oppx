const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function debugSubmittedDifference() {
  const client = await pool.connect();
  
  try {
    console.log('Debugging submitted amount difference...\n');
    
    // Check all weekly snapshots
    const allWeekly = await client.query(`
      SELECT id, snapshot_type, submitted_count, submitted_amount, saved_date, created_at
      FROM dashboard_snapshots 
      WHERE snapshot_type LIKE '%weekly%'
      ORDER BY created_at DESC;
    `);
    
    console.log('All weekly-related snapshots:');
    allWeekly.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}, Type: ${row.snapshot_type}`);
      console.log(`   Submitted: ${row.submitted_count} count, ₱${parseFloat(row.submitted_amount || 0).toLocaleString()}`);
      console.log(`   Saved: ${row.saved_date}, Created: ${row.created_at}\n`);
    });
    
    // Calculate the difference that's showing (44.8M)
    const currentAmount = 1447313507.86; // This week
    const lastWeekAmount = 1429914307.84; // Last week (what we want)
    const actualDatabaseAmount = 1492135581.64; // What we saw in actual DB
    
    console.log('Expected calculation:');
    console.log(`This week: ₱${currentAmount.toLocaleString()}`);
    console.log(`Last week: ₱${lastWeekAmount.toLocaleString()}`);
    console.log(`Expected difference: ₱${(currentAmount - lastWeekAmount).toLocaleString()}`);
    
    console.log('\nWhat might be causing 44.8M:');
    console.log(`Actual DB - This Week: ₱${(actualDatabaseAmount - currentAmount).toLocaleString()}`);
    console.log(`This Week - Last Week: ₱${(currentAmount - lastWeekAmount).toLocaleString()}`);
    
    // Check if there are multiple weekly snapshots
    const weeklyCount = await client.query(`
      SELECT COUNT(*) as count FROM dashboard_snapshots WHERE snapshot_type = 'weekly'
    `);
    
    console.log(`\nNumber of 'weekly' type snapshots: ${weeklyCount.rows[0].count}`);
    
    // Check what the dashboard logic might be using
    console.log('\nPossible dashboard comparison logic:');
    if (allWeekly.rows.length >= 2) {
      const latest = allWeekly.rows[0];
      const previous = allWeekly.rows[1];
      
      console.log(`Latest (${latest.snapshot_type}): ₱${parseFloat(latest.submitted_amount).toLocaleString()}`);
      console.log(`Previous (${previous.snapshot_type}): ₱${parseFloat(previous.submitted_amount).toLocaleString()}`);
      console.log(`Difference: ₱${(parseFloat(latest.submitted_amount) - parseFloat(previous.submitted_amount)).toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('Error debugging:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugSubmittedDifference()
  .then(() => {
    console.log('\nDebugging completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  });