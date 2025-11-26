// Fix Account Manager and PIC column swap in database
// This script will swap the values between account_mgr and pic columns

const { Client } = require('pg');

// Database configuration - modify as needed
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cmrp_opps_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function fixAccountMgrPicSwap() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // First, let's check the current data to confirm the issue
    console.log('\n=== CHECKING CURRENT DATA ===');
    const checkQuery = `
      SELECT project_name, account_mgr, pic 
      FROM opps_monitoring 
      WHERE account_mgr IS NOT NULL OR pic IS NOT NULL 
      ORDER BY project_name 
      LIMIT 10
    `;
    
    const checkResult = await client.query(checkQuery);
    console.log('Current data sample:');
    console.log('Project Name | Account Mgr | PIC');
    console.log('-------------|-------------|----');
    checkResult.rows.forEach(row => {
      console.log(`${(row.project_name || '').substring(0, 30).padEnd(30)} | ${(row.account_mgr || '').padEnd(11)} | ${row.pic || ''}`);
    });
    
    // Ask for confirmation before proceeding
    console.log('\n=== SWAP CONFIRMATION ===');
    console.log('This will swap the values between account_mgr and pic columns.');
    console.log('Current account_mgr values will move to pic column.');
    console.log('Current pic values will move to account_mgr column.');
    console.log('\nTo proceed, set CONFIRM_SWAP=true in environment variables or modify script.');
    
    if (process.env.CONFIRM_SWAP !== 'true') {
      console.log('SWAP NOT CONFIRMED - Exiting without changes');
      console.log('To run the swap, use: CONFIRM_SWAP=true node fix_account_mgr_pic_swap.js');
      return;
    }
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create a temporary column to hold account_mgr values
    console.log('\n=== PERFORMING SWAP ===');
    console.log('Step 1: Creating temporary column...');
    await client.query('ALTER TABLE opps_monitoring ADD COLUMN IF NOT EXISTS temp_account_mgr TEXT');
    
    // Copy account_mgr to temp column
    console.log('Step 2: Copying account_mgr to temporary column...');
    await client.query('UPDATE opps_monitoring SET temp_account_mgr = account_mgr');
    
    // Move pic to account_mgr
    console.log('Step 3: Moving pic values to account_mgr column...');
    await client.query('UPDATE opps_monitoring SET account_mgr = pic');
    
    // Move temp_account_mgr to pic
    console.log('Step 4: Moving original account_mgr values to pic column...');
    await client.query('UPDATE opps_monitoring SET pic = temp_account_mgr');
    
    // Drop temporary column
    console.log('Step 5: Cleaning up temporary column...');
    await client.query('ALTER TABLE opps_monitoring DROP COLUMN temp_account_mgr');
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Step 6: Transaction committed successfully');
    
    // Verify the swap
    console.log('\n=== VERIFICATION ===');
    const verifyResult = await client.query(checkQuery);
    console.log('Data after swap:');
    console.log('Project Name | Account Mgr | PIC');
    console.log('-------------|-------------|----');
    verifyResult.rows.forEach(row => {
      console.log(`${(row.project_name || '').substring(0, 30).padEnd(30)} | ${(row.account_mgr || '').padEnd(11)} | ${row.pic || ''}`);
    });
    
    // Count affected rows
    const countResult = await client.query('SELECT COUNT(*) as total FROM opps_monitoring');
    console.log(`\n✅ Successfully swapped account_mgr and pic columns for ${countResult.rows[0].total} records`);
    
  } catch (error) {
    console.error('❌ Error during swap operation:', error);
    
    // Rollback transaction on error
    try {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    
    throw error;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixAccountMgrPicSwap()
    .then(() => {
      console.log('\n🎉 Account Manager and PIC swap completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Failed to complete swap:', error.message);
      process.exit(1);
    });
}

module.exports = { fixAccountMgrPicSwap };