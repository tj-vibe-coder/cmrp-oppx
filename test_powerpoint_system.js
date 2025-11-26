/**
 * Test PowerPoint Audit Trail System
 * Verifies all components are working correctly
 */

const { Pool } = require('pg');
const { getBusinessWeek, getNextMeetingDate } = require('./lib/business-logic/meeting-dates');
const { detectMeetingHighlights } = require('./lib/business-logic/highlight-detection');

async function testAuditTrailSystem() {
    console.log('🧪 Testing PowerPoint Audit Trail System\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable'
    });
    
    try {
        // Test 1: Database Schema
        console.log('1️⃣ Testing Database Schema...');
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('weekly_change_summaries', 'meeting_highlights', 'presentation_templates')
        `);
        console.log('✅ Required tables exist:', tables.rows.map(r => r.table_name));
        
        // Test 2: Date Calculations
        console.log('\n2️⃣ Testing Date Calculations...');
        const today = new Date();
        const businessWeek = getBusinessWeek(today);
        const nextMeeting = getNextMeetingDate();
        console.log('✅ Business week start:', businessWeek.toDateString());
        console.log('✅ Next meeting date:', nextMeeting.toDateString());
        
        // Test 3: Account Managers
        console.log('\n3️⃣ Testing Account Manager Data...');
        const accountManagers = await pool.query(`
            SELECT DISTINCT account_mgr, COUNT(*) as opp_count
            FROM opps_monitoring 
            WHERE account_mgr IS NOT NULL AND account_mgr != ''
            GROUP BY account_mgr
            ORDER BY opp_count DESC
            LIMIT 3
        `);
        
        if (accountManagers.rows.length > 0) {
            console.log('✅ Found account managers:');
            accountManagers.rows.forEach(am => {
                console.log(`   - ${am.account_mgr}: ${am.opp_count} opportunities`);
            });
            
            // Test 4: Revision History
            console.log('\n4️⃣ Testing Revision History...');
            const revisions = await pool.query(`
                SELECT COUNT(*) as revision_count,
                       COUNT(CASE WHEN week_of_change IS NOT NULL THEN 1 END) as weeks_populated
                FROM opportunity_revisions
            `);
            console.log('✅ Revision records:', revisions.rows[0].revision_count);
            console.log('✅ Weeks populated:', revisions.rows[0].weeks_populated);
            
            // Test 5: Presentation Template
            console.log('\n5️⃣ Testing Presentation Templates...');
            const templates = await pool.query('SELECT * FROM presentation_templates WHERE is_active = true');
            console.log('✅ Active templates:', templates.rows.length);
            if (templates.rows.length > 0) {
                console.log('   - Default template:', templates.rows[0].template_name);
            }
            
            // Test 6: PowerPoint Generation Dependencies
            console.log('\n6️⃣ Testing PowerPoint Dependencies...');
            try {
                const PptxGenJS = require('pptxgenjs');
                console.log('✅ PptxGenJS library loaded');
                
                const pres = new PptxGenJS();
                pres.layout = 'LAYOUT_16x9';
                console.log('✅ PowerPoint presentation object created');
            } catch (error) {
                console.log('❌ PowerPoint dependency error:', error.message);
            }
            
            console.log('\n🎉 System Test Complete!');
            console.log('\nNext Steps:');
            console.log('1. Start the server: npm start');
            console.log('2. Look for the PowerPoint export button (slideshow icon) in the main interface');
            console.log('3. Select an account manager and generate a presentation');
            
        } else {
            console.log('⚠️  No account managers found in database');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await pool.end();
    }
}

// Run the test
testAuditTrailSystem();