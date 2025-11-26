const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function verifyAllAmounts() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying ALL amounts in dashboard_snapshots...\n');
    
    // Get current weekly snapshot
    const currentSnapshot = await client.query(`
      SELECT * FROM dashboard_snapshots 
      WHERE snapshot_type = 'weekly' 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (currentSnapshot.rows.length === 0) {
      console.log('No weekly snapshot found!');
      return;
    }
    
    const snapshot = currentSnapshot.rows[0];
    
    // Your original provided data for verification
    const expectedData = {
      submitted_count: 330,
      submitted_amount: 1447313507.86, // This week's amount we just corrected
      op100_count: 64,
      op100_amount: 72832918.71,
      op90_count: 26,
      op90_amount: 42819699.31,
      op60_count: 42,
      op60_amount: 138696192.85,
      op30_count: 132,
      op30_amount: 967778708.22,
      lost_count: 44,
      lost_amount: 119235266.80,
      inactive_count: 26,
      inactive_amount: 130750061.66,
      ongoing_count: 29,
      pending_count: 24,
      declined_count: 145,
      revised_count: 263,
      total_opportunities: 530
    };
    
    console.log('=== VERIFICATION RESULTS ===\n');
    
    // Check each field
    const checks = [
      { field: 'total_opportunities', expected: expectedData.total_opportunities, actual: snapshot.total_opportunities },
      { field: 'submitted_count', expected: expectedData.submitted_count, actual: snapshot.submitted_count },
      { field: 'submitted_amount', expected: expectedData.submitted_amount, actual: parseFloat(snapshot.submitted_amount) },
      { field: 'op100_count', expected: expectedData.op100_count, actual: snapshot.op100_count },
      { field: 'op100_amount', expected: expectedData.op100_amount, actual: parseFloat(snapshot.op100_amount) },
      { field: 'op90_count', expected: expectedData.op90_count, actual: snapshot.op90_count },
      { field: 'op90_amount', expected: expectedData.op90_amount, actual: parseFloat(snapshot.op90_amount) },
      { field: 'op60_count', expected: expectedData.op60_count, actual: snapshot.op60_count },
      { field: 'op60_amount', expected: expectedData.op60_amount, actual: parseFloat(snapshot.op60_amount) },
      { field: 'op30_count', expected: expectedData.op30_count, actual: snapshot.op30_count },
      { field: 'op30_amount', expected: expectedData.op30_amount, actual: parseFloat(snapshot.op30_amount) },
      { field: 'lost_count', expected: expectedData.lost_count, actual: snapshot.lost_count },
      { field: 'lost_amount', expected: expectedData.lost_amount, actual: parseFloat(snapshot.lost_amount) },
      { field: 'inactive_count', expected: expectedData.inactive_count, actual: snapshot.inactive_count },
      { field: 'ongoing_count', expected: expectedData.ongoing_count, actual: snapshot.ongoing_count },
      { field: 'pending_count', expected: expectedData.pending_count, actual: snapshot.pending_count },
      { field: 'declined_count', expected: expectedData.declined_count, actual: snapshot.declined_count },
      { field: 'revised_count', expected: expectedData.revised_count, actual: snapshot.revised_count }
    ];
    
    let incorrectFields = [];
    
    checks.forEach(check => {
      const isCorrect = Math.abs(check.expected - check.actual) < 0.01; // Allow for small floating point differences
      const status = isCorrect ? '✓' : '✗';
      
      if (check.field.includes('amount')) {
        console.log(`${status} ${check.field}: Expected ₱${check.expected.toLocaleString()}, Actual ₱${check.actual.toLocaleString()}`);
      } else {
        console.log(`${status} ${check.field}: Expected ${check.expected}, Actual ${check.actual}`);
      }
      
      if (!isCorrect) {
        incorrectFields.push(check);
      }
    });
    
    // Check for inactive_amount which might be missing
    if (snapshot.inactive_amount === null || snapshot.inactive_amount === undefined) {
      console.log('✗ inactive_amount: Expected ₱130,750,061.66, Actual NULL/MISSING');
      incorrectFields.push({
        field: 'inactive_amount',
        expected: expectedData.inactive_amount,
        actual: 0
      });
    }
    
    if (incorrectFields.length > 0) {
      console.log(`\n=== FOUND ${incorrectFields.length} INCORRECT FIELDS ===`);
      incorrectFields.forEach(field => {
        if (field.field.includes('amount')) {
          console.log(`- ${field.field}: Expected ₱${field.expected.toLocaleString()}, Got ₱${field.actual.toLocaleString()}`);
        } else {
          console.log(`- ${field.field}: Expected ${field.expected}, Got ${field.actual}`);
        }
      });
      
      return incorrectFields;
    } else {
      console.log('\n✓ ALL FIELDS ARE CORRECT!');
      return [];
    }
    
  } catch (error) {
    console.error('Error verifying amounts:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyAllAmounts()
  .then((incorrectFields) => {
    if (incorrectFields && incorrectFields.length > 0) {
      console.log(`\nFound ${incorrectFields.length} fields that need correction.`);
    } else {
      console.log('\nAll amounts verified successfully!');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });