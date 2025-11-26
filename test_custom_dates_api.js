// Test the custom dates API endpoint
const fetch = require('node-fetch');

async function testCustomDatesAPI() {
    try {
        const response = await fetch('https://cmrp-opps-backend.onrender.com/api/snapshots/custom-dates', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Note: This might fail without authentication, but let's see the response
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        if (response.ok) {
            const data = await response.json();
            console.log('API Response:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('Error response:', errorText);
        }

    } catch (error) {
        console.error('Error testing API:', error);
    }
}

testCustomDatesAPI();