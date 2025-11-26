#!/usr/bin/env node

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

async function checkGlobalSnapshotsTable() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Check if dashboard_snapshots table exists
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dashboard_snapshots'
            );
        `;
        
        const tableExists = await client.query(tableExistsQuery);
        console.log('dashboard_snapshots table exists:', tableExists.rows[0].exists);

        if (tableExists.rows[0].exists) {
            // Get table structure
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'dashboard_snapshots'
                ORDER BY ordinal_position;
            `;
            
            const structure = await client.query(structureQuery);
            console.log('\n📋 dashboard_snapshots Table Structure:');
            structure.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });

            // Check constraints
            const constraintsQuery = `
                SELECT 
                    tc.constraint_name,
                    tc.constraint_type,
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'dashboard_snapshots'
                AND tc.table_schema = 'public'
                ORDER BY tc.constraint_type, tc.constraint_name;
            `;
            
            const constraints = await client.query(constraintsQuery);
            console.log('\n🔒 Table Constraints:');
            if (constraints.rows.length === 0) {
                console.log('  No constraints found');
            } else {
                constraints.rows.forEach(row => {
                    console.log(`  ${row.constraint_type}: ${row.constraint_name} on ${row.column_name}`);
                });
            }

            // Check for existing data
            const countQuery = 'SELECT COUNT(*) as count FROM dashboard_snapshots';
            const count = await client.query(countQuery);
            console.log(`\n📊 Existing records: ${count.rows[0].count}`);

            if (count.rows[0].count > 0) {
                const sampleQuery = 'SELECT * FROM dashboard_snapshots ORDER BY created_at DESC LIMIT 3';
                const sample = await client.query(sampleQuery);
                console.log('\n🔍 Sample records:');
                sample.rows.forEach((row, i) => {
                    console.log(`  ${i+1}. ${row.snapshot_type} - ${row.snapshot_date} - Created: ${row.created_at}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkGlobalSnapshotsTable().catch(console.error);