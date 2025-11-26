const { Pool } = require('pg');
require('dotenv').config();

// Use the same database configuration as the main application
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cmrp_user:cmrp0601@100.118.59.44:5432/cmrp_opps_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set search path for all new connections
pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection\n');

  try {
    // Test basic connection
    console.log('1️⃣ Testing database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Check opps_monitoring table structure
    console.log('\n2️⃣ Checking opps_monitoring table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'opps_monitoring' 
      ORDER BY ordinal_position;
    `);

    if (tableInfo.rows.length === 0) {
      console.log('❌ opps_monitoring table not found!');
      return;
    }

    console.log('✅ opps_monitoring table found with columns:');
    tableInfo.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '- nullable' : '- required'}`);
    });

    // Check opportunity_revisions table
    console.log('\n3️⃣ Checking opportunity_revisions table...');
    const revisionTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'opportunity_revisions'
      );
    `);

    if (revisionTable.rows[0].exists) {
      console.log('✅ opportunity_revisions table exists - revision history will work!');
      
      // Check revision table structure
      const revisionCols = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'opportunity_revisions' 
        ORDER BY ordinal_position;
      `);
      
      const hasRequiredCols = ['opportunity_uid', 'revision_number', 'changed_by', 'changed_fields'].every(
        col => revisionCols.rows.some(row => row.column_name === col)
      );
      
      if (hasRequiredCols) {
        console.log('✅ All required revision columns present');
      } else {
        console.log('⚠️ Some revision columns may be missing');
      }
    } else {
      console.log('❌ opportunity_revisions table not found - revision history won\'t work');
    }

    // Sample data check
    console.log('\n4️⃣ Checking sample data...');
    const sampleData = await client.query('SELECT uid, project_name, client FROM opps_monitoring LIMIT 3');
    
    if (sampleData.rows.length > 0) {
      console.log(`✅ Found ${sampleData.rows.length} sample records:`);
      sampleData.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. UID: ${row.uid?.substring(0, 8)}... | Project: ${row.project_name || 'N/A'} | Client: ${row.client || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No data found in opps_monitoring table');
    }

    // Test a transaction (like the sync will use)
    console.log('\n5️⃣ Testing transaction capability...');
    await client.query('BEGIN');
    await client.query('SELECT 1'); // Dummy query
    await client.query('ROLLBACK');
    console.log('✅ Transaction support confirmed');

    client.release();
    console.log('\n🎉 Database connection test completed successfully!');
    
    // Show column mapping template
    console.log('\n📋 Column Mapping Template:');
    console.log('Based on your database, here are the available fields:');
    console.log('```javascript');
    console.log('const COLUMN_MAPPING = {');
    tableInfo.rows.forEach((col, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, etc.
      if (index < 26) { // Only show first 26 columns
        console.log(`  '${letter}': '${col.column_name}',`);
      }
    });
    console.log('};');
    console.log('```');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection(); 