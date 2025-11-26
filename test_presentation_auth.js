/**
 * Test presentation API authentication
 */

const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

async function testPresentationAuth() {
    console.log('🔐 Testing Presentation API Authentication\n');
    
    try {
        // Generate a test token
        const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
        const testUser = {
            id: 'test-user',
            email: 'test@example.com',
            username: 'testuser',
            accountType: 'Standard'
        };
        
        const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
        console.log('✅ Generated test token');
        
        // Test database connection for presentation endpoints
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable'
        });
        
        // Test account managers query
        console.log('📊 Testing account managers query...');
        const accountManagersResult = await pool.query(`
            SELECT DISTINCT 
                account_mgr as name,
                COUNT(*) as opportunity_count,
                SUM(final_amt) as total_pipeline
            FROM opps_monitoring 
            WHERE account_mgr IS NOT NULL 
            AND account_mgr != ''
            GROUP BY account_mgr
            ORDER BY account_mgr
        `);
        console.log('✅ Account managers query successful:', accountManagersResult.rows.length, 'found');
        
        // Test templates query
        console.log('📝 Testing templates query...');
        const templatesResult = await pool.query(`
            SELECT 
                id,
                template_name,
                slide_structure,
                color_scheme,
                is_active,
                created_by,
                created_at
            FROM presentation_templates
            WHERE is_active = true
            ORDER BY template_name
        `);
        console.log('✅ Templates query successful:', templatesResult.rows.length, 'found');
        
        await pool.end();
        
        console.log('\n🎯 Test Results:');
        console.log('- JWT token generation: ✅ Working');
        console.log('- Database connection: ✅ Working'); 
        console.log('- Account managers data: ✅ Available');
        console.log('- Templates data: ✅ Available');
        console.log('\n💡 Try using this token for testing:');
        console.log(token);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testPresentationAuth();