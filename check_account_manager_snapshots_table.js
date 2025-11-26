#!/usr/bin/env node

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

async function checkTableStructure() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Check if table exists
        const tableExistsQuery = `
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'account_manager_snapshots'
            );
        `;
        
        const tableExists = await client.query(tableExistsQuery);
        console.log('Table exists:', tableExists.rows[0].exists);

        if (tableExists.rows[0].exists) {
            // Get table structure
            const structureQuery = `
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'account_manager_snapshots'
                ORDER BY ordinal_position;
            `;
            
            const structure = await client.query(structureQuery);
            console.log('\n📋 Table Structure:');
            structure.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
            });

            // Check for existing data
            const countQuery = 'SELECT COUNT(*) as count FROM account_manager_snapshots';
            const count = await client.query(countQuery);
            console.log(`\n📊 Existing records: ${count.rows[0].count}`);

            if (count.rows[0].count > 0) {
                const sampleQuery = 'SELECT * FROM account_manager_snapshots LIMIT 3';
                const sample = await client.query(sampleQuery);
                console.log('\n🔍 Sample records:');
                sample.rows.forEach((row, i) => {
                    console.log(`  ${i+1}. ${row.account_manager} - ${row.snapshot_type} - ${row.snapshot_date}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.end();
    }
}

checkTableStructure().catch(console.error);