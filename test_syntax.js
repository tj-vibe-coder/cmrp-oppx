// Test script to check for syntax errors in forecastr_dashboard.js
const fs = require('fs');
const path = require('path');

try {
    const scriptPath = path.join(__dirname, 'forecastr_dashboard.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Try to create a function with the script content to check for syntax errors
    new Function(scriptContent);
    console.log('✅ No syntax errors found in forecastr_dashboard.js');
} catch (error) {
    console.error('❌ Syntax error found:');
    console.error(error.message);
    console.error('Stack:', error.stack);
}
