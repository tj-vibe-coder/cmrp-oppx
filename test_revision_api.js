#!/usr/bin/env node

// Test script to create a revision and check the data structure
const http = require('http');

const API_BASE = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        
        req.on('error', reject);
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testRevisionHistory() {
    console.log('🔍 Testing Revision History Data Structure\n');
    
    try {
        // Step 1: Login
        console.log('1. Logging in...');
        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: 'admin@example.com',
            password: 'admin123'
        });
        
        if (loginResponse.status !== 200) {
            console.log('❌ Login failed:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Step 2: Get opportunities
        console.log('\n2. Getting opportunities...');
        const oppsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/opportunities',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (oppsResponse.status !== 200 || !oppsResponse.data.length) {
            console.log('❌ No opportunities found:', oppsResponse.data);
            return;
        }
        
        const firstOpp = oppsResponse.data[0];
        console.log(`✅ Found ${oppsResponse.data.length} opportunities`);
        console.log(`   First opportunity UID: ${firstOpp.uid}`);
        console.log(`   Current margin: ${firstOpp.margin}`);
        
        // Step 3: Update the opportunity to create a revision
        console.log('\n3. Making a test update to create a revision...');
        const newMargin = parseFloat(firstOpp.margin || 0) + 1;
        console.log(`   Updating margin from ${firstOpp.margin} to ${newMargin}`);
        
        const updateResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: `/api/opportunities/${firstOpp.uid}`,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            margin: newMargin
        });
        
        if (updateResponse.status !== 200) {
            console.log('❌ Update failed:', updateResponse.data);
            return;
        }
        
        console.log('✅ Update successful');
        
        // Step 4: Get revision history
        console.log('\n4. Getting revision history...');
        const revisionsResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: `/api/opportunities/${firstOpp.uid}/revisions`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (revisionsResponse.status !== 200) {
            console.log('❌ Failed to get revisions:', revisionsResponse.data);
            return;
        }
        
        const revisions = revisionsResponse.data;
        console.log(`✅ Found ${revisions.length} revisions`);
        
        // Step 5: Analyze revision data
        console.log('\n5. Analyzing revision data...');
        revisions.forEach((revision, index) => {
            console.log(`\n--- Revision ${index + 1} ---`);
            console.log(`Revision Number: ${revision.revision_number}`);
            console.log(`Changed By: ${revision.changed_by}`);
            console.log(`Changed At: ${revision.changed_at}`);
            console.log(`Changed Fields (raw): ${revision.changed_fields}`);
            console.log(`Changed Fields Type: ${typeof revision.changed_fields}`);
            
            try {
                const parsedFields = JSON.parse(revision.changed_fields || '{}');
                console.log(`Parsed Fields:`, JSON.stringify(parsedFields, null, 2));
                console.log(`Field Count: ${Object.keys(parsedFields).length}`);
                
                if (Object.keys(parsedFields).length === 0) {
                    console.log('⚠️  This revision has NO field changes - will show "General update"');
                } else {
                    console.log('✅ This revision has specific field changes');
                    Object.entries(parsedFields).forEach(([field, change]) => {
                        console.log(`   ${field}: ${JSON.stringify(change)}`);
                    });
                }
            } catch (e) {
                console.log(`❌ Failed to parse changed_fields: ${e.message}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testRevisionHistory();
