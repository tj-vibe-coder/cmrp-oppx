const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function insertMissingRow() {
  const client = await pool.connect();
  
  try {
    console.log('Inserting the missing row with corrected date format...');
    
    // Convert "Thu, 30/7/25" to proper date format "2025-07-30"
    const correctedDate = '2025-07-30';
    
    const rowData = {
      revision: '1',
      rev: 0,
      margin: 15,
      encoded_date: '2025-04-23',
      project_name: 'Maintenance Service Agreement NS2550A)– Electrical System of WSO Facilities (2 years)',
      project_code: 'CMRP',
      client: 'MAYNILAD Water',
      solutions: 'Electrification',
      sol_particulars: 'ELECTRICAL',
      industries: 'Buildings',
      ind_particulars: 'UTILITIES',
      date_received: '2025-04-23',
      client_deadline: correctedDate, // Fixed date format
      decision: 'GO',
      account_mgr: 'JMO',
      pic: 'CBG',
      status: 'On-Going',
      submitted_date: null,
      final_amt: null,
      opp_status: null,
      date_awarded_lost: null,
      lost_rca: null,
      a: '2-Existing account with No Orders',
      c: '5 -Need External Resource',
      r: '8 -Strategic Business',
      u: '5 -Budgetary',
      d: '5 -Limited',
      remarks_comments: '11June, Pre-Bid; 24July Last Soth Grp 3 Site Inspection',
      uid: 'b4228fe6-4f9f-4b49-95a1-30c63d5526da'
    };
    
    const columns = Object.keys(rowData);
    const values = Object.values(rowData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    
    const insertQuery = `INSERT INTO opps_monitoring (${columnNames}) VALUES (${placeholders})`;
    
    await client.query(insertQuery, values);
    console.log('Successfully inserted the missing row with corrected date format');
    
    // Check final count
    const countResult = await client.query('SELECT COUNT(*) FROM opps_monitoring');
    console.log(`Total rows in opps_monitoring table: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('Error inserting missing row:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertMissingRow()
  .then(() => {
    console.log('Missing row insertion completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Missing row insertion failed:', error);
    process.exit(1);
  });