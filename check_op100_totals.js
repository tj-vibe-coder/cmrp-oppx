const { Pool } = require('pg');

// Production database connection
const pool = new Pool({
  connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function checkOP100Totals() {
  try {
    console.log('🔍 Checking OP100 status totals from opps_monitoring table...\n');
    
    // Query OP100 records
    const result = await pool.query(`
      SELECT 
        opp_status,
        COUNT(*) as count,
        SUM(final_amt) as total_amount,
        ARRAY_AGG(project_name ORDER BY final_amt DESC) FILTER (WHERE final_amt IS NOT NULL) as top_projects
      FROM opps_monitoring 
      WHERE opp_status = 'OP100'
      GROUP BY opp_status
    `);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`📊 OP100 Summary:`);
      console.log(`   Count: ${row.count}`);
      console.log(`   Total Amount: ₱${row.total_amount?.toLocaleString() || '0'}`);
      console.log(`\n📋 Top 10 Projects by Amount:`);
      
      if (row.top_projects) {
        row.top_projects.slice(0, 10).forEach((project, index) => {
          console.log(`   ${index + 1}. ${project}`);
        });
      }
    } else {
      console.log('❌ No OP100 records found');
    }
    
    // Also get a breakdown of all statuses for context
    console.log('\n📈 All Status Summary:');
    const allStatuses = await pool.query(`
      SELECT 
        opp_status,
        COUNT(*) as count,
        SUM(final_amt) as total_amount
      FROM opps_monitoring 
      WHERE opp_status IS NOT NULL
      GROUP BY opp_status
      ORDER BY COUNT(*) DESC
    `);
    
    allStatuses.rows.forEach(row => {
      console.log(`   ${row.opp_status}: ${row.count} records, ₱${row.total_amount?.toLocaleString() || '0'}`);
    });
    
    // Check for individual OP100 records with amounts
    console.log('\n💰 Individual OP100 Records:');
    const individualRecords = await pool.query(`
      SELECT 
        project_name,
        final_amt,
        client,
        date_awarded_lost
      FROM opps_monitoring 
      WHERE opp_status = 'OP100' AND final_amt IS NOT NULL
      ORDER BY final_amt DESC
      LIMIT 20
    `);
    
    individualRecords.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.project_name} - ₱${record.final_amt?.toLocaleString()} (${record.client})`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error querying database:', error);
    await pool.end();
  }
}

checkOP100Totals();