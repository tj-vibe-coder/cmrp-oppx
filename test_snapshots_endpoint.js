const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function testSnapshotInsert() {
  const client = await pool.connect();
  
  try {
    console.log('Testing snapshot insert with the fixed query...');
    
    const query = `
        INSERT INTO dashboard_snapshots (
            snapshot_type, snapshot_date, total_opportunities, submitted_count, submitted_amount,
            op100_count, op100_amount, op90_count, op90_amount, 
            op60_count, op60_amount, op30_count, op30_amount,
            lost_count, lost_amount, inactive_count, ongoing_count,
            pending_count, declined_count, revised_count
        ) VALUES (
            $1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19
        ) 
        ON CONFLICT (snapshot_type) 
        DO UPDATE SET
            snapshot_date = CURRENT_DATE,
            total_opportunities = EXCLUDED.total_opportunities,
            submitted_count = EXCLUDED.submitted_count,
            submitted_amount = EXCLUDED.submitted_amount,
            op100_count = EXCLUDED.op100_count,
            op100_amount = EXCLUDED.op100_amount,
            op90_count = EXCLUDED.op90_count,
            op90_amount = EXCLUDED.op90_amount,
            op60_count = EXCLUDED.op60_count,
            op60_amount = EXCLUDED.op60_amount,
            op30_count = EXCLUDED.op30_count,
            op30_amount = EXCLUDED.op30_amount,
            lost_count = EXCLUDED.lost_count,
            lost_amount = EXCLUDED.lost_amount,
            inactive_count = EXCLUDED.inactive_count,
            ongoing_count = EXCLUDED.ongoing_count,
            pending_count = EXCLUDED.pending_count,
            declined_count = EXCLUDED.declined_count,
            revised_count = EXCLUDED.revised_count,
            saved_date = CURRENT_TIMESTAMP
        RETURNING *
    `;

    const values = [
        'weekly', 582, 377, 1519270146.48,
        72, 77201539.80, 22, 40729015.58,
        48, 237549182.43, 159, 836643163.78,
        49, 165740700.88, 30, 30,
        23, 150, 300
    ];

    const result = await client.query(query, values);
    
    console.log('SUCCESS! Snapshot saved with ID:', result.rows[0].id);
    console.log('Snapshot date:', result.rows[0].snapshot_date);
    console.log('Saved at:', result.rows[0].saved_date);
    
  } catch (error) {
    console.error('Error testing snapshot insert:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testSnapshotInsert();
