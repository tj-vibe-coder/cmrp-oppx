/**
 * Migration Verification Script
 * Compares data counts between PostgreSQL export and SQLiteCloud import
 */

const { Database } = require('@sqlitecloud/drivers');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function verifyMigration() {
    try {
        console.log('🔍 Migration Verification Tool\n');

        // Read exported data
        console.log('📖 Reading exported data...');
        const exportedData = JSON.parse(fs.readFileSync('postgres_data_export.json', 'utf8'));
        const tableNames = Object.keys(exportedData);

        console.log(`Found ${tableNames.length} tables in export\n`);

        // Get SQLiteCloud connection
        const connectionString = await question('Enter your SQLiteCloud connection string: ');

        if (!connectionString || !connectionString.startsWith('sqlitecloud://')) {
            console.error('❌ Invalid connection string');
            rl.close();
            process.exit(1);
        }

        console.log('\n📡 Connecting to SQLiteCloud...');
        const db = new Database(connectionString);
        console.log('✅ Connected\n');

        // Verify each table
        console.log('🔎 Verifying data counts...\n');
        console.log('─'.repeat(80));
        console.log('Table Name'.padEnd(35) + 'Exported'.padEnd(15) + 'Imported'.padEnd(15) + 'Status');
        console.log('─'.repeat(80));

        let allMatch = true;
        const mismatches = [];

        for (const tableName of tableNames) {
            const exportedCount = exportedData[tableName].length;

            try {
                const result = await db.sql(`SELECT COUNT(*) as count FROM ${tableName}`);
                const importedCount = parseInt(result[0].count);

                const match = exportedCount === importedCount;
                const status = match ? '✅ OK' : '❌ MISMATCH';

                console.log(
                    tableName.padEnd(35) +
                    exportedCount.toString().padEnd(15) +
                    importedCount.toString().padEnd(15) +
                    status
                );

                if (!match) {
                    allMatch = false;
                    mismatches.push({
                        table: tableName,
                        exported: exportedCount,
                        imported: importedCount
                    });
                }
            } catch (error) {
                console.log(
                    tableName.padEnd(35) +
                    exportedCount.toString().padEnd(15) +
                    'ERROR'.padEnd(15) +
                    '❌ FAILED'
                );
                allMatch = false;
                mismatches.push({
                    table: tableName,
                    exported: exportedCount,
                    imported: 0,
                    error: error.message
                });
            }
        }

        console.log('─'.repeat(80));

        // Summary
        console.log('\n📊 Verification Summary\n');

        if (allMatch) {
            console.log('✅ SUCCESS! All data migrated correctly.');
            console.log(`   ${tableNames.length} tables verified`);

            // Calculate total rows
            const totalRows = Object.values(exportedData).reduce((sum, rows) => sum + rows.length, 0);
            console.log(`   ${totalRows.toLocaleString()} total rows migrated`);
        } else {
            console.log('⚠️  WARNINGS DETECTED\n');
            console.log('The following tables have mismatches:\n');

            mismatches.forEach(m => {
                console.log(`❌ ${m.table}`);
                console.log(`   Expected: ${m.exported} rows`);
                console.log(`   Found: ${m.imported} rows`);
                if (m.error) {
                    console.log(`   Error: ${m.error}`);
                }
                console.log('');
            });

            console.log('Please check the import logs and try re-importing these tables.');
        }

        // Additional checks
        console.log('\n🔍 Running additional checks...\n');

        // Check for users
        const usersResult = await db.sql('SELECT COUNT(*) as count FROM users');
        console.log(`✅ Users table: ${usersResult[0].count} users`);

        // Check for opportunities
        const oppsResult = await db.sql('SELECT COUNT(*) as count FROM opps_monitoring');
        console.log(`✅ Opportunities: ${oppsResult[0].count} opportunities`);

        // Check if foreign keys are enabled
        const fkResult = await db.sql('PRAGMA foreign_keys');
        console.log(`${fkResult[0].foreign_keys ? '✅' : '⚠️ '} Foreign keys: ${fkResult[0].foreign_keys ? 'Enabled' : 'Disabled'}`);

        // Sample a few records
        console.log('\n📋 Sample data check...');
        const sampleUser = await db.sql('SELECT email, name, created_at FROM users LIMIT 1');
        if (sampleUser.length > 0) {
            console.log('✅ Sample user:', {
                email: sampleUser[0].email,
                name: sampleUser[0].name,
                created_at: sampleUser[0].created_at
            });
        }

        db.close();
        rl.close();

        console.log('\n✅ Verification complete!\n');

        if (allMatch) {
            console.log('🎉 You can now update your application to use SQLiteCloud!');
            console.log('\nNext steps:');
            console.log('1. Update .env with: DATABASE_URL=' + connectionString);
            console.log('2. Update server.js to use db_adapter.js');
            console.log('3. Test your application');
        }

    } catch (error) {
        console.error('\n❌ Verification error:', error.message);
        console.error(error);
        rl.close();
        process.exit(1);
    }
}

verifyMigration();
