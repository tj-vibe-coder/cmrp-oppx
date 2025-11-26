// Test script to verify last login functionality
const https = require('https');
const http = require('http');

async function testLastLogin() {
    try {
        console.log('Testing last login functionality...');
        
        // Test login endpoint
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'irene.balleras@cmrpautomation.com',
                password: 'test123' // Replace with actual password if needed
            })
        });
        
        const loginData = await loginResponse.json();
        
        if (loginResponse.ok) {
            console.log('✅ Login successful');
            console.log('Token received:', loginData.token.substring(0, 50) + '...');
            
            // Test users endpoint to see last login
            const usersResponse = await fetch('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': `Bearer ${loginData.token}`
                }
            });
            
            if (usersResponse.ok) {
                const users = await usersResponse.json();
                console.log('✅ Users API working');
                console.log('Sample user with last login:', users[0]);
                console.log('Last login field present:', !!users[0].lastLoginAt);
            } else {
                console.log('❌ Users API failed:', usersResponse.status);
            }
        } else {
            console.log('❌ Login failed:', loginData);
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    }
}

testLastLogin();