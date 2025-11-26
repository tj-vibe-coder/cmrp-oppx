#!/usr/bin/env node

/**
 * Test script to verify the PUT endpoint validation fix
 * This script tests that the PUT endpoint now accepts empty string values
 * without throwing 400 Bad Request errors
 */

const https = require('https');
const http = require('http');

const SERVER_URL = 'http://localhost:3000';

// Test credentials (using the admin account from the system)
const TEST_CREDENTIALS = {
    email: 'reuel.rivera@cmrpautomation.com',
    password: 'cmrp0601'
};

async function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(SERVER_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testPutValidationFix() {
    console.log('🧪 Testing PUT endpoint validation fix...\n');

    try {
        // Step 1: Login to get auth token
        console.log('1. Logging in...');
        const loginResponse = await makeRequest('POST', '/api/login', TEST_CREDENTIALS);
        
        if (loginResponse.status !== 200) {
            console.error('❌ Login failed:', loginResponse);
            return;
        }
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful\n');

        // Step 2: Get list of opportunities to find one to edit
        console.log('2. Fetching opportunities...');
        const oppsResponse = await makeRequest('GET', '/api/opportunities', null, token);
        
        if (oppsResponse.status !== 200 || !oppsResponse.data.length) {
            console.error('❌ Failed to fetch opportunities or no opportunities found:', oppsResponse);
            return;
        }
        
        const testOpp = oppsResponse.data[0];
        console.log(`✅ Found opportunity to test: ${testOpp.uid}\n`);

        // Step 3: Test PUT with empty string values (this should work now)
        console.log('3. Testing PUT with empty string values...');
        const updateData = {
            project_name: '', // Empty string - should be accepted now
            client: '',       // Empty string - should be accepted now  
            account_mgr: '',  // Empty string - should be accepted now
            opp_name: 'Test Update with Empty Fields',
            changed_by: 'test-script'
        };

        const putResponse = await makeRequest('PUT', `/api/opportunities/${testOpp.uid}`, updateData, token);
        
        console.log(`PUT Response Status: ${putResponse.status}`);
        console.log('PUT Response Data:', JSON.stringify(putResponse.data, null, 2));

        if (putResponse.status === 200) {
            console.log('\n✅ SUCCESS: PUT request with empty strings accepted!');
            console.log('✅ The validation fix is working correctly.');
        } else if (putResponse.status === 400) {
            console.log('\n❌ FAILED: PUT request still returning 400 Bad Request');
            console.log('❌ The validation fix may not be applied correctly.');
            
            if (putResponse.data.details) {
                console.log('Validation errors:', putResponse.data.details);
            }
        } else {
            console.log(`\n⚠️  Unexpected response status: ${putResponse.status}`);
        }

        // Step 4: Test with valid data to ensure normal functionality still works
        console.log('\n4. Testing PUT with valid data...');
        const validUpdateData = {
            project_name: 'Valid Project Name',
            client: 'Valid Client Name',
            account_mgr: 'Valid Account Manager',
            changed_by: 'test-script'
        };

        const validPutResponse = await makeRequest('PUT', `/api/opportunities/${testOpp.uid}`, validUpdateData, token);
        
        if (validPutResponse.status === 200) {
            console.log('✅ PUT with valid data also works correctly');
        } else {
            console.log('❌ PUT with valid data failed:', validPutResponse);
        }

    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Run the test
testPutValidationFix();
