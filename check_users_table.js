const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

async function checkUsersTable() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking if users table exists...');

        // Check if users table exists
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'users'
            );
        `;

        const tableExists = await client.query(tableExistsQuery);
        console.log(`Users table exists: ${tableExists.rows[0].exists}`);

        if (tableExists.rows[0].exists) {
            console.log('📊 Users table structure:');
            const structureQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            `;

            const structure = await client.query(structureQuery);
            structure.rows.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
            });

            // Check users data
            const usersQuery = `SELECT id, name, email FROM users LIMIT 5`;
            try {
                const users = await client.query(usersQuery);
                console.log(`\n👥 Sample users (${users.rows.length} shown):`);
                users.rows.forEach(user => {
                    console.log(`  - ${user.name} (${user.email}) ID: ${user.id}`);
                });
            } catch (err) {
                console.log(`❌ Error querying users: ${err.message}`);
            }
        } else {
            console.log('❌ Users table does not exist!');

            // Let's check what tables do exist
            console.log('\n📋 Available tables:');
            const tablesQuery = `
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            `;

            const tables = await client.query(tablesQuery);
            tables.rows.forEach(table => {
                console.log(`  - ${table.table_name}`);
            });
        }

        // Test the get_schedule_users function
        console.log('\n🎯 Testing get_schedule_users() function...');
        try {
            const scheduleUsers = await client.query('SELECT * FROM get_schedule_users()');
            console.log(`Found ${scheduleUsers.rows.length} schedule users:`);
            scheduleUsers.rows.forEach(user => {
                console.log(`  - ${user.user_name} (ID: ${user.user_id}) - ${user.schedule_count} items`);
            });
        } catch (err) {
            console.log(`❌ Error calling get_schedule_users(): ${err.message}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkUsersTable().catch(console.error);
