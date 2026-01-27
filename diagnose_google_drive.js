/**
 * Diagnostic script to check Google Drive service configuration
 */

require('dotenv').config();
const GoogleDriveService = require('./google_drive_service');
const fs = require('fs');
const path = require('path');

async function diagnoseGoogleDrive() {
    console.log('🔍 Diagnosing Google Drive Service Configuration');
    console.log('================================================\n');

    // Check environment variables
    console.log('1. Checking Environment Variables...');
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const credentialsPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || './google-drive-credentials.json';
    
    if (serviceAccountKey) {
        console.log('   ✅ GOOGLE_SERVICE_ACCOUNT_KEY is set');
        try {
            const parsed = JSON.parse(serviceAccountKey);
            console.log('   ✅ Service account key is valid JSON');
            console.log('   📧 Service account email:', parsed.client_email || 'Not found');
        } catch (error) {
            console.log('   ❌ GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON:', error.message);
        }
    } else {
        console.log('   ⚠️  GOOGLE_SERVICE_ACCOUNT_KEY is not set');
        console.log('   💡 Will try to use credentials file instead');
    }

    console.log('\n2. Checking Credentials File...');
    const fullPath = path.resolve(process.cwd(), credentialsPath);
    if (fs.existsSync(fullPath)) {
        console.log(`   ✅ Credentials file exists: ${fullPath}`);
        try {
            const credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            console.log('   ✅ Credentials file is valid JSON');
            console.log('   📧 Service account email:', credentials.client_email || 'Not found');
        } catch (error) {
            console.log('   ❌ Credentials file is not valid JSON:', error.message);
        }
    } else {
        console.log(`   ❌ Credentials file not found: ${fullPath}`);
        console.log('   💡 Either set GOOGLE_SERVICE_ACCOUNT_KEY or create the credentials file');
    }

    console.log('\n3. Testing Google Drive Service Initialization...');
    try {
        const driveService = new GoogleDriveService();
        const initialized = await driveService.initialize();
        
        if (initialized) {
            console.log('   ✅ Google Drive service initialized successfully');
            
            // Test a simple API call
            console.log('\n4. Testing Google Drive API Connection...');
            try {
                // Try to list files (this will fail if no permissions, but will confirm API is working)
                const testResult = await driveService.drive.files.list({
                    pageSize: 1,
                    fields: 'files(id, name)'
                });
                console.log('   ✅ Google Drive API connection successful');
                console.log('   📊 API is responding correctly');
            } catch (apiError) {
                if (apiError.message.includes('insufficient authentication')) {
                    console.log('   ⚠️  API connection works but authentication may be insufficient');
                    console.log('   💡 Check service account permissions in Google Cloud Console');
                } else if (apiError.message.includes('not found')) {
                    console.log('   ⚠️  API connection works but service account may not have access');
                } else {
                    console.log('   ❌ API connection test failed:', apiError.message);
                }
            }
        } else {
            console.log('   ❌ Google Drive service failed to initialize');
            console.log('   💡 Check credentials and ensure service account has Drive API enabled');
        }
    } catch (error) {
        console.log('   ❌ Error initializing Google Drive service:', error.message);
        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
            console.log('   💡 Credentials file not found. Set GOOGLE_SERVICE_ACCOUNT_KEY or create credentials file');
        } else if (error.message.includes('invalid_grant')) {
            console.log('   💡 Service account credentials may be invalid or expired');
        } else if (error.message.includes('insufficient')) {
            console.log('   💡 Service account may not have required permissions');
        }
    }

    console.log('\n================================================');
    console.log('📋 SUMMARY:');
    
    if (!serviceAccountKey && !fs.existsSync(fullPath)) {
        console.log('   ❌ CRITICAL: No Google Drive credentials found');
        console.log('   🔧 FIX: Set GOOGLE_SERVICE_ACCOUNT_KEY in .env or create credentials file');
    } else {
        console.log('   ✅ Credentials are configured');
        console.log('   💡 If sync still fails, check:');
        console.log('      1. Service account has Drive API enabled');
        console.log('      2. Service account has access to the Drive folders');
        console.log('      3. Network connectivity to Google APIs');
    }
}

diagnoseGoogleDrive().catch(error => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
});
