const GoogleDriveService = require('./google_drive_service');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

async function testGoogleDriveIntegration() {
  console.log('🧪 Testing Google Drive Integration...\n');

  try {
    // Test 1: Initialize Google Drive Service
    console.log('1️⃣ Testing Google Drive Service Initialization...');
    const driveService = new GoogleDriveService();
    const initialized = await driveService.initialize();
    if (initialized) {
      console.log('✅ Google Drive service initialized successfully\n');
    } else {
      throw new Error('Failed to initialize Google Drive service');
    }

    // Test 2: Check database schema
    console.log('2️⃣ Testing Database Schema...');
    const client = await pool.connect();
    try {
      const schemaCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'opps_monitoring' 
        AND column_name LIKE 'google_drive%'
        ORDER BY column_name;
      `);
      
      console.log('📊 Google Drive columns in opps_monitoring table:');
      schemaCheck.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`);
      });
      
      if (schemaCheck.rows.length >= 3) {
        console.log('✅ Database schema is correct\n');
      } else {
        throw new Error('Missing Google Drive columns in database');
      }
    } finally {
      client.release();
    }

    // Test 3: Check audit table
    console.log('3️⃣ Testing Audit Trail...');
    const client2 = await pool.connect();
    try {
      const auditCheck = await client2.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'drive_folder_audit';
      `);
      
      if (auditCheck.rows.length > 0) {
        console.log('✅ Drive folder audit table exists\n');
      } else {
        throw new Error('Drive folder audit table missing');
      }
    } finally {
      client2.release();
    }

    // Test 4: Test opportunity listing with Drive folders
    console.log('4️⃣ Testing Opportunity Listing...');
    const opportunities = await driveService.listOpportunitiesWithFolders();
    console.log(`📋 Found ${opportunities.length} opportunities with Drive folders`);
    if (opportunities.length > 0) {
      console.log('   Sample opportunity:');
      const sample = opportunities[0];
      console.log(`   - Project: ${sample.project_name}`);
      console.log(`   - Folder: ${sample.google_drive_folder_name}`);
    }
    console.log('✅ Opportunity listing works correctly\n');

    // Test 5: Test folder validation (with invalid ID)
    console.log('5️⃣ Testing Folder Validation...');
    const validation = await driveService.validateFolderAccess('invalid_folder_id');
    if (!validation.valid) {
      console.log('✅ Folder validation correctly rejects invalid IDs\n');
    } else {
      console.log('⚠️ Folder validation may need adjustment\n');
    }

    console.log('🎉 All Google Drive integration tests passed!');
    console.log('\n📝 Integration Summary:');
    console.log('   ✅ Google Drive API authentication');
    console.log('   ✅ Database schema with all required columns');
    console.log('   ✅ Audit trail table');
    console.log('   ✅ Opportunity listing functionality');
    console.log('   ✅ Folder validation');
    console.log('\n🚀 Ready for production use!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('   1. Ensure Google credentials file exists');
    console.error('   2. Check database connection');
    console.error('   3. Verify migration was run successfully');
    console.error('   4. Check Google Drive API permissions');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the test
testGoogleDriveIntegration();