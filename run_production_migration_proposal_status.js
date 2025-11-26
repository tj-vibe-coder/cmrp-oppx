// Run missing proposal_status migration on production database
const { Pool } = require('pg');
require('dotenv').config();

const PRODUCTION_DB_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-Southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: PRODUCTION_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('=== RUNNING PROPOSAL STATUS MIGRATION ===');
  
  try {
    // Check if proposal_status column exists
    console.log('1. Checking if proposal_status column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'opps_monitoring' AND column_name = 'proposal_status'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ proposal_status column already exists');
      return;
    }
    
    console.log('❌ proposal_status column missing, adding it...');
    
    // Add proposal_status column
    await pool.query(`
      ALTER TABLE opps_monitoring 
      ADD COLUMN proposal_status VARCHAR(20) CHECK (proposal_status IN ('not_started', 'ongoing', 'for_approval', 'submitted'))
    `);
    console.log('✅ Added proposal_status column');
    
    // Set default proposal_status based on existing data
    console.log('2. Setting default values...');
    const updateResult = await pool.query(`
      UPDATE opps_monitoring
      SET proposal_status = 
        CASE 
          WHEN submitted_date IS NOT NULL THEN 'submitted'
          ELSE 'not_started'
        END
      WHERE proposal_status IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowCount} rows with default proposal_status`);
    
    // Check if revision column exists and add if missing
    console.log('3. Checking revision column...');
    const revisionCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'opps_monitoring' AND column_name = 'revision'
    `);
    
    if (revisionCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE opps_monitoring 
        ADD COLUMN revision VARCHAR(20)
      `);
      console.log('✅ Added revision column');
    } else {
      console.log('✅ revision column already exists');
    }
    
    // Verify the changes
    console.log('4. Verifying changes...');
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN proposal_status = 'submitted' THEN 1 END) as submitted_count,
        COUNT(CASE WHEN proposal_status = 'not_started' THEN 1 END) as not_started_count
      FROM opps_monitoring
    `);
    
    const stats = verifyResult.rows[0];
    console.log(`✅ Migration completed successfully:`);
    console.log(`   Total rows: ${stats.total_rows}`);
    console.log(`   Submitted: ${stats.submitted_count}`);
    console.log(`   Not started: ${stats.not_started_count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch(console.error);