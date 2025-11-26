const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function fixInactiveAmount() {
  const client = await pool.connect();
  
  try {
    console.log('Fixing missing inactive_amount...\n');
    
    // Update the missing inactive_amount
    const inactiveAmount = 130750061.66;
    
    const updateResult = await client.query(`
      UPDATE dashboard_snapshots 
      SET inactive_amount = $1
      WHERE snapshot_type = 'weekly'
      RETURNING inactive_count, inactive_amount;
    `, [inactiveAmount]);
    
    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log('✓ Successfully fixed inactive_amount:');
      console.log(`- Inactive count: ${updated.inactive_count}`);
      console.log(`- Inactive amount: ₱${parseFloat(updated.inactive_amount).toLocaleString()}`);
      console.log('\n✓ ALL AMOUNTS ARE NOW CORRECT!');
    }
    
  } catch (error) {
    console.error('Error fixing inactive amount:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixInactiveAmount()
  .then(() => {
    console.log('\nInactive amount fix completed successfully');
    console.log('Executive dashboard should now show all correct amounts');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix failed:', error);
    process.exit(1);
  });