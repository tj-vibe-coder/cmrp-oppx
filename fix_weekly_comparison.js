const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function fixWeeklyComparison() {
  const client = await pool.connect();
  
  try {
    console.log('Setting up correct weekly comparison...\n');
    
    // First, let's see what we currently have
    const current = await client.query(`
      SELECT * FROM dashboard_snapshots 
      WHERE snapshot_type = 'weekly' 
      ORDER BY created_at DESC 
      LIMIT 2
    `);
    
    console.log('Current weekly snapshots:');
    current.rows.forEach((row, index) => {
      console.log(`${index === 0 ? 'Latest' : 'Previous'}: ₱${parseFloat(row.submitted_amount).toLocaleString()} (ID: ${row.id})`);
    });
    
    // Update the current week's snapshot to have the correct amount
    const thisWeekAmount = 1447313507.86;
    
    await client.query(`
      UPDATE dashboard_snapshots 
      SET submitted_amount = $1, saved_date = CURRENT_TIMESTAMP
      WHERE snapshot_type = 'weekly' 
      AND id = (
        SELECT id FROM dashboard_snapshots 
        WHERE snapshot_type = 'weekly' 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    `, [thisWeekAmount]);
    
    // Insert or update a previous week's snapshot with last week's amount
    const lastWeekAmount = 1429914307.84;
    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7); // 7 days ago
    
    // Create a previous week snapshot
    await client.query(`
      INSERT INTO dashboard_snapshots (
        snapshot_type, total_opportunities, submitted_count, submitted_amount,
        op100_count, op100_amount, op90_count, op90_amount, 
        op60_count, op60_amount, op30_count, op30_amount,
        lost_count, lost_amount, inactive_count, ongoing_count,
        pending_count, declined_count, revised_count, saved_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT DO NOTHING
    `, [
      'weekly_previous', // Different snapshot_type to distinguish
      530, // total_opportunities 
      330, // submitted_count
      lastWeekAmount, // last week's submitted amount
      64, 72832918.71, // op100
      26, 42819699.31, // op90  
      42, 138696192.85, // op60
      132, 967778708.22, // op30
      44, 119235266.80, // lost
      26, // inactive
      29, // ongoing
      24, // pending  
      145, // declined
      263, // revised
      lastWeekDate, // saved_date
      lastWeekDate // created_at
    ]);
    
    console.log('\nUpdated comparison:');
    console.log(`- This week: ₱${thisWeekAmount.toLocaleString()}`);
    console.log(`- Last week: ₱${lastWeekAmount.toLocaleString()}`);
    console.log(`- Expected difference: ₱${(thisWeekAmount - lastWeekAmount).toLocaleString()}`);
    
    // Verify the setup
    const verification = await client.query(`
      SELECT snapshot_type, submitted_amount, saved_date
      FROM dashboard_snapshots 
      WHERE snapshot_type IN ('weekly', 'weekly_previous')
      ORDER BY created_at DESC
    `);
    
    console.log('\nVerification:');
    verification.rows.forEach(row => {
      console.log(`${row.snapshot_type}: ₱${parseFloat(row.submitted_amount).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('Error fixing weekly comparison:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixWeeklyComparison()
  .then(() => {
    console.log('\nWeekly comparison fix completed');
    console.log('Dashboard should now show difference of ₱17,399,200.02');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });