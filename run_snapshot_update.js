// Direct database update script for snapshots
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set search path for consistency
pool.on('connect', (client) => {
    client.query('SET search_path TO public');
});

async function updateSnapshots() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting snapshot updates...');
        
        // First, let's see the current snapshot data
        console.log('📊 Current snapshot data:');
        const current = await client.query(`
            SELECT snapshot_type, op100_count, op100_amount, saved_date 
            FROM dashboard_snapshots 
            WHERE snapshot_type IN ('weekly', 'monthly')
            ORDER BY snapshot_type
        `);
        
        current.rows.forEach(row => {
            console.log(`  ${row.snapshot_type}: OP100 = ₱${row.op100_amount?.toLocaleString() || 'null'} (${row.op100_count || 'null'} count) - ${row.saved_date}`);
        });
        
        console.log('\n🔧 Updating with correct data...');
        
        // Update Weekly Snapshot (June 11 data)
        console.log('📅 Updating weekly snapshot...');
        const weeklyResult = await client.query(`
            UPDATE dashboard_snapshots 
            SET 
                total_opportunities = 428,
                submitted_count = 270,
                submitted_amount = 988982107.40,
                op100_count = 38,
                op100_amount = 59237774.52,
                op90_count = 27,
                op90_amount = 48294418.13,
                op60_count = 41,
                op60_amount = 166184874.70,
                op30_count = 120,
                op30_amount = 661162427.75,
                lost_count = 31,
                lost_amount = 59020750.46,
                inactive_count = 8,
                ongoing_count = 19,
                pending_count = 29,
                declined_count = 109,
                revised_count = 104,
                saved_date = CURRENT_TIMESTAMP
            WHERE snapshot_type = 'weekly'
            RETURNING snapshot_type, op100_count, op100_amount
        `);
        
        if (weeklyResult.rows.length > 0) {
            const row = weeklyResult.rows[0];
            console.log(`✅ Weekly updated: OP100 = ₱${row.op100_amount.toLocaleString()} (${row.op100_count} count)`);
        } else {
            console.log('⚠️  No weekly snapshot found to update');
        }
        
        // Update Monthly Snapshot
        console.log('📅 Updating monthly snapshot...');
        const monthlyResult = await client.query(`
            UPDATE dashboard_snapshots 
            SET 
                total_opportunities = 409,
                submitted_count = 271,
                submitted_amount = 939235994.10,
                op100_count = 34,
                op100_amount = 56135271.31,
                op90_count = 29,
                op90_amount = 43222843.87,
                op60_count = 41,
                op60_amount = 188367129.90,
                op30_count = 108,
                op30_amount = 620682214.65,
                lost_count = 31,
                lost_amount = 52993964.75,
                inactive_count = 7,
                ongoing_count = 22,
                pending_count = 27,
                declined_count = 102,
                revised_count = 99,
                saved_date = CURRENT_TIMESTAMP
            WHERE snapshot_type = 'monthly'
            RETURNING snapshot_type, op100_count, op100_amount
        `);
        
        if (monthlyResult.rows.length > 0) {
            const row = monthlyResult.rows[0];
            console.log(`✅ Monthly updated: OP100 = ₱${row.op100_amount.toLocaleString()} (${row.op100_count} count)`);
        } else {
            console.log('⚠️  No monthly snapshot found to update');
        }
        
        // Verify the final state
        console.log('\n📊 Final snapshot data:');
        const final = await client.query(`
            SELECT snapshot_type, op100_count, op100_amount, saved_date 
            FROM dashboard_snapshots 
            WHERE snapshot_type IN ('weekly', 'monthly')
            ORDER BY snapshot_type
        `);
        
        final.rows.forEach(row => {
            console.log(`  ${row.snapshot_type}: OP100 = ₱${row.op100_amount?.toLocaleString() || 'null'} (${row.op100_count || 'null'} count) - ${row.saved_date}`);
        });
        
        console.log('\n🎉 Snapshot updates completed successfully!');
        console.log('🔄 Now refresh your executive dashboard to see the corrected OP100 deltas.');
        console.log('📈 Expected results:');
        console.log('   • Weekly delta: Current ₱65.0M - Updated ₱59.2M = +₱5.8M');
        console.log('   • Monthly delta: Current ₱65.0M - Updated ₱56.1M = +₱8.9M');
        
    } catch (error) {
        console.error('❌ Error updating snapshots:', error);
        
        // If snapshots don't exist, let's create them
        if (error.message && error.message.includes('does not exist')) {
            console.log('💡 Snapshots table might not exist or snapshots missing. Let me check...');
            
            try {
                const checkTable = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'dashboard_snapshots'
                    );
                `);
                
                if (checkTable.rows[0].exists) {
                    console.log('📋 Table exists, checking for existing snapshots...');
                    const existing = await client.query('SELECT snapshot_type FROM dashboard_snapshots');
                    console.log(`📊 Found ${existing.rows.length} existing snapshots:`, existing.rows.map(r => r.snapshot_type));
                } else {
                    console.log('❌ dashboard_snapshots table does not exist!');
                }
            } catch (checkError) {
                console.error('❌ Error checking table:', checkError.message);
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
}

updateSnapshots(); 