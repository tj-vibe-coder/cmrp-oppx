const { Database } = require('@sqlitecloud/drivers');
const fs = require('fs');

const CONNECTION_STRING = 'sqlitecloud://cguxse6mvk.g4.sqlite.cloud:8860/cmrp-oppx?apikey=22C0CAgc51jfEnavN6i0kGGUNafnvDzW01U53xD2aMI';

async function cleanImport() {
    try {
        console.log('🌩️  SQLiteCloud Clean Import Tool\n');
        console.log('📡 Connecting to SQLiteCloud...');

        const db = new Database(CONNECTION_STRING);
        console.log('✅ Connected\n');

        // Step 1: Drop all existing tables
        console.log('🗑️  Dropping existing tables...');

        const tableNames = [
            'user_roles', 'user_notifications', 'user_column_preferences',
            'schedule_task_completion', 'quotation_comments', 'quotation_line_items',
            'quotation_revisions', 'quotations', 'proposal_story_entries',
            'proposal_schedule', 'drive_folder_audit', 'forecast_revisions',
            'opportunity_revisions', 'custom_tasks', 'account_manager_snapshots',
            'dashboard_snapshots', 'custom_snapshots', 'weekly_snapshot',
            'proposal_status_history', 'story_entry_types', 'role_definitions',
            'catalog_items', 'catalog_upload_history', 'opps_monitoring',
            'opps_monitoring_backup_20250619', 'playing_with_neon',
            'migration_log', 'users', 'roles'
        ];

        for (const table of tableNames) {
            try {
                await db.sql(`DROP TABLE IF EXISTS ${table}`);
                console.log(`  ✅ Dropped ${table}`);
            } catch (error) {
                // Ignore errors if table doesn't exist
            }
        }

        // Step 2: Create tables from schema
        console.log('\n🏗️  Creating tables...');
        const schema = fs.readFileSync('sqlite_schema.sql', 'utf8');

        const statements = schema
            .split('\n')
            .filter(line => !line.startsWith('--') && line.trim().length > 0)
            .join('\n')
            .split(';')
            .filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            const tableName = statement.match(/CREATE TABLE (\w+)/i)?.[1];
            if (tableName) {
                try {
                    await db.sql(statement + ';');
                    console.log(`  ✅ Created ${tableName}`);
                } catch (error) {
                    console.error(`  ❌ Error creating ${tableName}:`, error.message);
                }
            }
        }

        // Step 3: Enable foreign keys
        await db.sql('PRAGMA foreign_keys = ON');

        // Step 4: Import data
        console.log('\n📦 Importing data...');
        const data = JSON.parse(fs.readFileSync('postgres_data_export.json', 'utf8'));

        // Import in order to respect foreign key constraints
        const importOrder = [
            'roles',
            'users',
            'story_entry_types',
            'role_definitions',
            'opps_monitoring',
            'opps_monitoring_backup_20250619',
            'playing_with_neon',
            'catalog_items',
            'catalog_upload_history',
            'migration_log',
            'user_column_preferences',
            'user_roles',
            'opportunity_revisions',
            'forecast_revisions',
            'drive_folder_audit',
            'proposal_status_history',
            'proposal_story_entries',
            'proposal_schedule',
            'schedule_task_completion',
            'custom_tasks',
            'account_manager_snapshots',
            'dashboard_snapshots',
            'custom_snapshots',
            'weekly_snapshot',
            'user_notifications',
            'quotations',
            'quotation_line_items',
            'quotation_revisions',
            'quotation_comments'
        ];

        for (const tableName of importOrder) {
            if (!data[tableName] || data[tableName].length === 0) {
                console.log(`  ⏭️  Skipping ${tableName} (no data)`);
                continue;
            }

            const rows = data[tableName];
            console.log(`  📊 Importing ${rows.length} rows into ${tableName}...`);

            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => '?').join(', ');
            const columnNames = columns.join(', ');
            const insertSQL = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;

            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                try {
                    const values = columns.map(col => {
                        let val = row[col];

                        // Handle boolean conversion
                        if (typeof val === 'boolean') {
                            return val ? 1 : 0;
                        }

                        // Handle dates
                        if (val instanceof Date) {
                            return val.toISOString();
                        }

                        // Handle JSON/JSONB
                        if (val !== null && typeof val === 'object') {
                            return JSON.stringify(val);
                        }

                        return val;
                    });

                    await db.sql(insertSQL, ...values);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    if (errorCount === 1) {
                        console.error(`    ⚠️  First error: ${error.message}`);
                    }
                }
            }

            console.log(`  ✅ ${tableName}: ${successCount}/${rows.length} imported (${errorCount} errors)`);
        }

        console.log('\n✅ Migration completed!');

        // Verify data
        console.log('\n📊 Data summary:');
        const keyCounts = [
            'users',
            'opps_monitoring',
            'custom_tasks',
            'proposal_schedule',
            'drive_folder_audit'
        ];

        for (const table of keyCounts) {
            try {
                const result = await db.sql(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`  ${table}: ${result[0].count} rows`);
            } catch (error) {
                console.log(`  ${table}: error`);
            }
        }

        // Save success marker
        fs.writeFileSync('.env.sqlitecloud', `DATABASE_URL=${CONNECTION_STRING}\n`);
        console.log('\n💾 Connection string saved to .env.sqlitecloud');
        console.log('\n🎉 Ready to use! Update your .env file with the connection string.');

        db.close();

    } catch (error) {
        console.error('\n❌ Migration error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

cleanImport();
