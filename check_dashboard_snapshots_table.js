const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function checkTableStructure() {
  const client = await pool.connect();
  
  try {
    // Check if dashboard_snapshots table exists and its structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'dashboard_snapshots'
      ORDER BY ordinal_position
    `);
    
    console.log('Dashboard Snapshots table structure:');
    if (result.rows.length === 0) {
      console.log('Table does not exist');
    } else {
      result.rows.forEach(row => {
        console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable}) ${row.column_default || ''}`);
      });
    }
    
    // Check if there are any unique constraints
    const constraintResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'dashboard_snapshots'
    `);
    
    console.log('\nTable constraints:');
    if (constraintResult.rows.length === 0) {
      console.log('No constraints found');
    } else {
      constraintResult.rows.forEach(row => {
        console.log(`${row.constraint_name}: ${row.constraint_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking table structure:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();
