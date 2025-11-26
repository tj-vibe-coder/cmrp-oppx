const GoogleDriveService = require('./google_drive_service');

async function testDriveAccess() {
    console.log('🧪 Testing Google Drive Access...\n');

    try {
        const driveService = new GoogleDriveService();
        await driveService.initialize();
        console.log('✅ GoogleDriveService initialized successfully\n');

        // Test the specific folder ID from the user
        const userFolderId = '0BwLYHtwPeCSpX0ZYU1EwTUhsOEk';
        console.log(`🔍 Testing access to folder: ${userFolderId}`);

        const validation = await driveService.validateFolderAccess(userFolderId);
        console.log('📋 Validation result:', validation);

        if (validation.valid) {
            console.log('✅ SUCCESS: Can access the folder!');
        } else {
            console.log('❌ FAILED: Cannot access the folder');
            console.log('Error details:', validation.error);
        }

        // Test if we can access root folder
        console.log('\n🔍 Testing access to root folder for comparison...');
        const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
        console.log(`Root folder ID: ${rootFolderId}`);
        
        if (rootFolderId && rootFolderId !== userFolderId) {
            const rootValidation = await driveService.validateFolderAccess(rootFolderId);
            console.log('📋 Root folder validation:', rootValidation);
        } else {
            console.log('Root folder is the same as user folder or not set');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Full error:', error);
    }
}

testDriveAccess();