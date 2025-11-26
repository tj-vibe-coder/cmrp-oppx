const { Database } = require('@sqlitecloud/drivers');

const CONNECTION_STRING = 'sqlitecloud://cguxse6mvk.g4.sqlite.cloud:8860/cmrp-oppx?apikey=22C0CAgc51jfEnavN6i0kGGUNafnvDzW01U53xD2aMI';

async function checkStatus() {
    try {
        console.log('📡 Connecting to SQLiteCloud...\n');
        const db = new Database(CONNECTION_STRING);

        // Get all tables
        const tables = await db.sql('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name');

        console.log(`📊 Found ${tables.length} tables:\n`);

        console.log('─'.repeat(50));
        console.log('Table Name'.padEnd(35) + 'Row Count');
        console.log('─'.repeat(50));

        let totalRows = 0;

        for (const table of tables) {
            const tableName = table.name;
            try {
                const result = await db.sql(`SELECT COUNT(*) as count FROM "${tableName}"`);
                const count = parseInt(result[0].count);
                totalRows += count;
                console.log(tableName.padEnd(35) + count);
            } catch (error) {
                console.log(tableName.padEnd(35) + 'ERROR');
            }
        }

        console.log('─'.repeat(50));
        console.log('TOTAL'.padEnd(35) + totalRows);
        console.log('─'.repeat(50));

        db.close();
        console.log('\n✅ Check complete!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkStatus();
