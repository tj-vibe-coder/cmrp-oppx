#!/usr/bin/env node

/**
 * Test Business Snapshot Scheduler
 * Purpose: Test the automatic snapshot creation functionality
 */

const { Client } = require('pg');
const BusinessSnapshotScheduler = require('./backend/services/business-snapshot-scheduler');

const DATABASE_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

async function testBusinessScheduler() {
    const client = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🧪 Testing Business Snapshot Scheduler...\n');
        
        await client.connect();
        console.log('✓ Connected to database');

        // Initialize scheduler
        const scheduler = new BusinessSnapshotScheduler(client);
        
        // Test manual triggers
        console.log('\n📋 Testing Manual Weekly Report Trigger...');
        const weeklyResults = await scheduler.triggerPresidentReport('Test Weekly Report - Manual Trigger');
        
        console.log(`✓ Weekly Report Results:`);
        console.log(`  - Total created: ${weeklyResults.summary.total_created}`);
        console.log(`  - Errors: ${weeklyResults.summary.total_errors}`);
        console.log(`  - Account managers processed: ${weeklyResults.summary.account_managers_processed}`);
        
        if (weeklyResults.errors.length > 0) {
            console.log(`  ❌ Errors:`);
            weeklyResults.errors.forEach(error => {
                console.log(`    - ${error.account_manager}: ${error.error}`);
            });
        }

        console.log('\n📋 Testing Manual Townhall Trigger...');
        const townhallResults = await scheduler.triggerTownhall('Test Townhall - Manual Trigger');
        
        console.log(`✓ Townhall Results:`);
        console.log(`  - Total created: ${townhallResults.summary.total_created}`);
        console.log(`  - Errors: ${townhallResults.summary.total_errors}`);
        console.log(`  - Account managers processed: ${townhallResults.summary.account_managers_processed}`);
        
        if (townhallResults.errors.length > 0) {
            console.log(`  ❌ Errors:`);
            townhallResults.errors.forEach(error => {
                console.log(`    - ${error.account_manager}: ${error.error}`);
            });
        }

        // Verify snapshots in database
        console.log('\n🔍 Verifying snapshots in database...');
        const today = new Date().toISOString().split('T')[0];
        
        const verificationQuery = `
            SELECT 
                account_manager,
                snapshot_type,
                total_opportunities,
                submitted_count,
                created_at
            FROM account_manager_snapshots 
            WHERE snapshot_date = $1
            AND DATE(created_at) = $1
            ORDER BY account_manager, snapshot_type
        `;
        
        const verification = await client.query(verificationQuery, [today]);
        console.log(`📊 Found ${verification.rows.length} snapshots created today by scheduler`);
        
        if (verification.rows.length > 0) {
            console.log('\n📈 Recent Snapshots:');
            verification.rows.forEach(row => {
                console.log(`  ${row.account_manager} (${row.snapshot_type}): ${row.total_opportunities} opps, ${row.submitted_count} submitted`);
            });
        }

        // Test scheduler status
        console.log('\n📊 Scheduler Status:');
        const status = scheduler.getStatus();
        console.log(`  - Running: ${status.running}`);
        console.log(`  - Next weekly: ${status.next_schedules.weekly_report}`);
        console.log(`  - Next townhall: ${status.next_schedules.townhall_meeting}`);

        console.log('\n✅ Business Scheduler Test Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await client.end();
        console.log('✓ Database connection closed');
    }
}

// Run the test
testBusinessScheduler().catch(console.error);