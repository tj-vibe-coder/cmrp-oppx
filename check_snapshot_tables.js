const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function checkSnapshotTables() {
  const client = await pool.connect();
  
  try {
    console.log('Checking existing snapshot tables...');
    
    // Check what tables exist with 'snapshot' in the name
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%snapshot%'
      ORDER BY table_name;
    `);
    
    console.log('Existing snapshot tables:');
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // If we have existing snapshot tables, show their structure
    for (const table of tablesResult.rows) {
      console.log(`\n--- Structure of ${table.table_name} ---`);
      
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [table.table_name]);
      
      columnsResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
      });
      
      // Show sample data
      const sampleResult = await client.query(`SELECT * FROM ${table.table_name} LIMIT 5`);
      console.log(`\nSample data from ${table.table_name}:`);
      sampleResult.rows.forEach((row, index) => {
        console.log(`  Row ${index + 1}:`, row);
      });
    }
    
  } catch (error) {
    console.error('Error checking snapshot tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSnapshotTables()
  .then(() => {
    console.log('\nSnapshot tables check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Snapshot tables check failed:', error);
    process.exit(1);
  });