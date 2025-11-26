#!/usr/bin/env node

/**
 * Manual Account Manager Snapshots Generator
 * Purpose: Create account manager-specific snapshots manually for current state
 */

const { Client } = require('pg');

// Database configuration
const DATABASE_URL = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

class ManualAccountManagerSnapshots {
    constructor() {
        this.client = new Client({
            connectionString: DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('[MANUAL-SNAPSHOTS] Connected to database');
        } catch (error) {
            console.error('[MANUAL-SNAPSHOTS] Database connection failed:', error);
            throw error;
        }
    }

    async disconnect() {
        await this.client.end();
        console.log('[MANUAL-SNAPSHOTS] Disconnected from database');
    }

    /**
     * Get all active account managers
     */
    async getAccountManagers() {
        const query = `
            SELECT code, name
            FROM role_definitions
            WHERE role_type = 'account_manager'
            AND is_active = TRUE
            AND is_resigned = FALSE
            ORDER BY code
        `;
        const result = await this.client.query(query);
        console.log(`[MANUAL-SNAPSHOTS] Found ${result.rows.length} active account managers`);
        return result.rows;
    }

    /**
     * Get metrics for a specific account manager
     */
    async getAccountManagerMetrics(accountManager) {
        const query = `
            SELECT 
                COUNT(*) as total_opportunities,
                COUNT(CASE WHEN status = 'Submitted' THEN 1 END) as submitted_count,
                COALESCE(SUM(CASE WHEN status = 'Submitted' THEN final_amt END), 0) as submitted_amount,
                COUNT(CASE WHEN opp_status = 'OP100' THEN 1 END) as op100_count,
                COALESCE(SUM(CASE WHEN opp_status = 'OP100' THEN final_amt END), 0) as op100_amount,
                COUNT(CASE WHEN opp_status = 'OP90' THEN 1 END) as op90_count,
                COALESCE(SUM(CASE WHEN opp_status = 'OP90' THEN final_amt END), 0) as op90_amount,
                COUNT(CASE WHEN opp_status = 'OP60' THEN 1 END) as op60_count,
                COALESCE(SUM(CASE WHEN opp_status = 'OP60' THEN final_amt END), 0) as op60_amount,
                COUNT(CASE WHEN opp_status = 'OP30' THEN 1 END) as op30_count,
                COALESCE(SUM(CASE WHEN opp_status = 'OP30' THEN final_amt END), 0) as op30_amount,
                COUNT(CASE WHEN opp_status = 'LOST' OR decision = 'Lost' THEN 1 END) as lost_count,
                COALESCE(SUM(CASE WHEN opp_status = 'LOST' OR decision = 'Lost' THEN final_amt END), 0) as lost_amount,
                COUNT(CASE WHEN opp_status = 'Inactive' THEN 1 END) as inactive_count,
                COUNT(CASE WHEN status = 'On-Going' THEN 1 END) as ongoing_count,
                COUNT(CASE WHEN decision = 'Pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN decision = 'Decline' THEN 1 END) as declined_count,
                COUNT(CASE WHEN opp_status = 'Revised' THEN 1 END) as revised_count
            FROM opps_monitoring 
            WHERE account_mgr = $1
        `;
        const result = await this.client.query(query, [accountManager]);
        return result.rows[0];
    }

    /**
     * Create account manager snapshot
     */
    async createAccountManagerSnapshot(accountManager, snapshotType, snapshotDate, metrics, description) {
        const query = `
            INSERT INTO account_manager_snapshots (
                account_manager, snapshot_type, snapshot_date,
                total_opportunities, submitted_count, submitted_amount,
                op100_count, op100_amount, op90_count, op90_amount,
                op60_count, op60_amount, op30_count, op30_amount,
                lost_count, lost_amount, inactive_count, ongoing_count,
                pending_count, declined_count, revised_count,
                created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 
                $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP
            )
            ON CONFLICT (account_manager, snapshot_type, snapshot_date) 
            DO UPDATE SET
                total_opportunities = EXCLUDED.total_opportunities,
                submitted_count = EXCLUDED.submitted_count,
                submitted_amount = EXCLUDED.submitted_amount,
                op100_count = EXCLUDED.op100_count,
                op100_amount = EXCLUDED.op100_amount,
                op90_count = EXCLUDED.op90_count,
                op90_amount = EXCLUDED.op90_amount,
                op60_count = EXCLUDED.op60_count,
                op60_amount = EXCLUDED.op60_amount,
                op30_count = EXCLUDED.op30_count,
                op30_amount = EXCLUDED.op30_amount,
                lost_count = EXCLUDED.lost_count,
                lost_amount = EXCLUDED.lost_amount,
                inactive_count = EXCLUDED.inactive_count,
                ongoing_count = EXCLUDED.ongoing_count,
                pending_count = EXCLUDED.pending_count,
                declined_count = EXCLUDED.declined_count,
                revised_count = EXCLUDED.revised_count,
                updated_at = CURRENT_TIMESTAMP
        `;

        const values = [
            accountManager, snapshotType, snapshotDate,
            metrics.total_opportunities, metrics.submitted_count, metrics.submitted_amount,
            metrics.op100_count, metrics.op100_amount, metrics.op90_count, metrics.op90_amount,
            metrics.op60_count, metrics.op60_amount, metrics.op30_count, metrics.op30_amount,
            metrics.lost_count, metrics.lost_amount, metrics.inactive_count, metrics.ongoing_count,
            metrics.pending_count, metrics.declined_count, metrics.revised_count
        ];

        await this.client.query(query, values);
    }

    /**
     * Create snapshots for all account managers
     */
    async createAllAccountManagerSnapshots() {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const description = `Manual Account Manager Snapshot - ${todayStr}`;
        
        // Create both weekly and monthly snapshots
        const snapshotTypes = ['weekly_president', 'monthly_townhall'];
        const results = {
            success: [],
            errors: [],
            summary: {
                total_created: 0,
                total_errors: 0
            }
        };

        try {
            // Get all account managers
            const accountManagers = await this.getAccountManagers();
            
            if (accountManagers.length === 0) {
                console.warn('[MANUAL-SNAPSHOTS] No active account managers found');
                return results;
            }

            // Create snapshots for each type and each account manager
            for (const snapshotType of snapshotTypes) {
                console.log(`\n[MANUAL-SNAPSHOTS] Creating ${snapshotType} snapshots...`);
                
                for (const manager of accountManagers) {
                    try {
                        console.log(`[MANUAL-SNAPSHOTS] Processing ${manager.code} (${manager.name})...`);
                        
                        // Get metrics for this account manager
                        const metrics = await this.getAccountManagerMetrics(manager.code);
                        
                        if (!metrics || metrics.total_opportunities == 0) {
                            console.log(`[MANUAL-SNAPSHOTS] No opportunities found for ${manager.code}, skipping...`);
                            continue;
                        }

                        // Create snapshot
                        await this.createAccountManagerSnapshot(
                            manager.code,
                            snapshotType,
                            todayStr,
                            metrics,
                            `${description} - ${snapshotType}`
                        );

                        results.success.push({
                            account_manager: manager.code,
                            snapshot_type: snapshotType,
                            metrics_preview: {
                                total_opportunities: metrics.total_opportunities,
                                submitted_count: metrics.submitted_count,
                                submitted_amount: parseFloat(metrics.submitted_amount)
                            }
                        });
                        results.summary.total_created++;
                        
                        console.log(`[MANUAL-SNAPSHOTS] ✓ Created ${snapshotType} snapshot for ${manager.code} - ${metrics.total_opportunities} opps, ${metrics.submitted_count} submitted`);
                        
                    } catch (error) {
                        console.error(`[MANUAL-SNAPSHOTS] ✗ Failed to create ${snapshotType} snapshot for ${manager.code}:`, error);
                        results.errors.push({
                            account_manager: manager.code,
                            snapshot_type: snapshotType,
                            error: error.message
                        });
                        results.summary.total_errors++;
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('[MANUAL-SNAPSHOTS] Critical error during snapshot creation:', error);
            throw error;
        }
    }

    /**
     * Verify snapshots were created
     */
    async verifySnapshots() {
        const today = new Date().toISOString().split('T')[0];
        
        const query = `
            SELECT 
                account_manager,
                snapshot_type,
                snapshot_date,
                total_opportunities,
                submitted_count,
                submitted_amount,
                created_at
            FROM account_manager_snapshots 
            WHERE snapshot_date = $1
            AND DATE(created_at) = $2
            ORDER BY account_manager, snapshot_type
        `;
        
        const result = await this.client.query(query, [today, today]);
        
        console.log(`\n[MANUAL-SNAPSHOTS] Verification: Found ${result.rows.length} snapshots created today`);
        
        if (result.rows.length > 0) {
            console.log('\n📊 Created Snapshots Summary:');
            result.rows.forEach(row => {
                console.log(`  ${row.account_manager} (${row.snapshot_type}): ${row.total_opportunities} opps, ${row.submitted_count} submitted, $${parseFloat(row.submitted_amount).toLocaleString()}`);
            });
        }
        
        return result.rows;
    }
}

// Main execution
async function main() {
    const generator = new ManualAccountManagerSnapshots();
    
    try {
        console.log('🚀 Starting Manual Account Manager Snapshots Generation...\n');
        
        await generator.connect();
        
        // Create snapshots
        const results = await generator.createAllAccountManagerSnapshots();
        
        // Verify creation
        const verification = await generator.verifySnapshots();
        
        // Summary
        console.log('\n📋 FINAL SUMMARY:');
        console.log(`✓ Successfully created: ${results.summary.total_created} snapshots`);
        console.log(`✗ Errors encountered: ${results.summary.total_errors} snapshots`);
        console.log(`📊 Database verification: ${verification.length} snapshots found`);
        
        if (results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            results.errors.forEach(error => {
                console.log(`  ${error.account_manager} (${error.snapshot_type}): ${error.error}`);
            });
        }
        
    } catch (error) {
        console.error('💥 Script execution failed:', error);
    } finally {
        await generator.disconnect();
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ManualAccountManagerSnapshots;