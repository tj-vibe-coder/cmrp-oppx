const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function analyzeTotalOpportunities() {
  const client = await pool.connect();
  
  try {
    console.log('Analyzing total opportunities calculation...\n');
    
    // Get current dashboard snapshot
    const currentSnapshot = await client.query(`
      SELECT * FROM dashboard_snapshots 
      WHERE snapshot_type = 'weekly' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (currentSnapshot.rows.length > 0) {
      const snapshot = currentSnapshot.rows[0];
      console.log('Current weekly snapshot in dashboard_snapshots:');
      console.log(`- Total opportunities: ${snapshot.total_opportunities}`);
      console.log(`- Submitted: ${snapshot.submitted_count}`);
      console.log(`- OP100: ${snapshot.op100_count}`);
      console.log(`- OP90: ${snapshot.op90_count}`);
      console.log(`- OP60: ${snapshot.op60_count}`);
      console.log(`- OP30: ${snapshot.op30_count}`);
      console.log(`- LOST: ${snapshot.lost_count}`);
      console.log(`- Inactive: ${snapshot.inactive_count}`);
      console.log(`- On-going: ${snapshot.ongoing_count}`);
      console.log(`- Pending: ${snapshot.pending_count}`);
      console.log(`- Declined: ${snapshot.declined_count}`);
      console.log(`- Revised: ${snapshot.revised_count}`);
      
      // Calculate what the total should be based on individual counts
      const calculatedTotal = 
        (snapshot.submitted_count || 0) +
        (snapshot.op100_count || 0) +
        (snapshot.op90_count || 0) +
        (snapshot.op60_count || 0) +
        (snapshot.op30_count || 0) +
        (snapshot.lost_count || 0) +
        (snapshot.inactive_count || 0) +
        (snapshot.ongoing_count || 0) +
        (snapshot.pending_count || 0) +
        (snapshot.declined_count || 0) +
        (snapshot.revised_count || 0);
      
      console.log(`\nCalculated total from individual counts: ${calculatedTotal}`);
      console.log(`Stored total_opportunities: ${snapshot.total_opportunities}`);
      console.log(`Difference: ${snapshot.total_opportunities - calculatedTotal}`);
    }
    
    // Get actual count from opps_monitoring table
    console.log('\n--- Checking actual data from opps_monitoring table ---');
    
    const actualCounts = await client.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(CASE WHEN final_amt IS NOT NULL AND final_amt > 0 THEN final_amt ELSE 0 END) as total_amount
      FROM opps_monitoring 
      GROUP BY status 
      ORDER BY status;
    `);
    
    console.log('Actual counts from opps_monitoring table:');
    let actualTotal = 0;
    actualCounts.rows.forEach(row => {
      console.log(`- ${row.status || 'NULL/Empty'}: ${row.count} records (₱${parseFloat(row.total_amount || 0).toLocaleString()})`);
      actualTotal += parseInt(row.count);
    });
    
    console.log(`\nActual total from opps_monitoring: ${actualTotal}`);
    
    // Check if there are any NULL status records
    const nullStatus = await client.query(`
      SELECT COUNT(*) as count FROM opps_monitoring WHERE status IS NULL OR status = ''
    `);
    
    if (nullStatus.rows[0].count > 0) {
      console.log(`Records with NULL/empty status: ${nullStatus.rows[0].count}`);
    }
    
    // Get the total count from opps_monitoring
    const totalInDB = await client.query('SELECT COUNT(*) as total FROM opps_monitoring');
    console.log(`Total records in opps_monitoring table: ${totalInDB.rows[0].total}`);
    
    // Compare with what we expect
    console.log('\n--- Expected vs Actual ---');
    console.log('Your provided data totals:');
    console.log('- Submitted: 330');
    console.log('- OP100: 64'); 
    console.log('- OP90: 26');
    console.log('- OP60: 42');
    console.log('- OP30: 132');
    console.log('- LOST: 44');
    console.log('- Inactive: 26');
    console.log('- On-going: 29');
    console.log('- Pending: 24');
    console.log('- Decline: 145');
    console.log('- Revised: 263');
    
    const expectedTotal = 330 + 64 + 26 + 42 + 132 + 44 + 26 + 29 + 24 + 145 + 263;
    console.log(`Expected total: ${expectedTotal}`);
    console.log(`Difference with opps_monitoring: ${totalInDB.rows[0].total - expectedTotal}`);
    
  } catch (error) {
    console.error('Error analyzing total opportunities:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

analyzeTotalOpportunities()
  .then(() => {
    console.log('\nAnalysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Analysis failed:', error);
    process.exit(1);
  });