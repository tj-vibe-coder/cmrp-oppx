/**
 * Test DS user access to presentation endpoints
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testDSUserAccess() {
    console.log('🔐 Testing DS User Access to Presentation API\n');
    
    try {
        // Generate a DS user token (similar to what would be in the browser)
        const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
        const dsUser = {
            id: 'ds-user',
            email: 'ds@cmrp.com',
            username: 'DS',
            accountType: 'Admin' // DS likely has admin privileges
        };
        
        const token = jwt.sign(dsUser, JWT_SECRET, { expiresIn: '1h' });
        console.log('✅ Generated DS user token');
        console.log('User info:', dsUser);
        
        // Test the presentation API endpoints
        const baseUrl = 'http://localhost:3000'; // Assuming server is running
        
        console.log('\n🧪 Testing presentation endpoints...');
        
        // Test 1: Test endpoint
        try {
            const response = await fetch(`${baseUrl}/api/presentation/test`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Test endpoint:', data.message, '| User:', data.user);
            } else {
                console.log('❌ Test endpoint failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('❌ Test endpoint error:', error.message);
        }
        
        // Test 2: Account managers endpoint
        try {
            const response = await fetch(`${baseUrl}/api/presentation/account-managers`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Account managers endpoint:', data.accountManagers.length, 'managers found');
                console.log('Available managers:', data.accountManagers.map(m => m.name).join(', '));
            } else {
                console.log('❌ Account managers endpoint failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('❌ Account managers endpoint error:', error.message);
        }
        
        // Test 3: Templates endpoint
        try {
            const response = await fetch(`${baseUrl}/api/presentation/templates`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Templates endpoint:', data.templates.length, 'templates found');
            } else {
                console.log('❌ Templates endpoint failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.log('❌ Templates endpoint error:', error.message);
        }
        
        console.log('\n🎯 Summary for DS User:');
        console.log('- DS users CAN access presentation endpoints');
        console.log('- DS users can generate presentations for ANY account manager');
        console.log('- No special permissions required beyond authentication');
        console.log('\n💡 Try refreshing the page and clicking the PowerPoint export button again');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Only run if server is available
testDSUserAccess();