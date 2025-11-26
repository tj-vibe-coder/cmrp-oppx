const GoogleDriveService = require('./google_drive_service');

async function testServerEndpointLogic() {
    console.log('🧪 Testing Server Endpoint Logic...\n');

    try {
        // Simulate the exact server logic
        const uid = '453c5db8-3bb0-415c-beef-aadb3b760436';
        const folderId = '0BwLYHtwPeCSpX0ZYU1EwTUhsOEk';
        
        console.log(`[PUT /api/opportunities/${uid}/drive-folder] === START ===`);
        console.log(`[DEBUG] Request body:`, { folderId });
        console.log(`[DEBUG] Folder ID:`, folderId);
        console.log(`[DEBUG] Folder ID type:`, typeof folderId);
        console.log(`[DEBUG] Folder ID length:`, folderId ? folderId.length : 'N/A');

        // Validation 1: Check if folderId exists
        if (!folderId) {
            console.log(`[ERROR] Missing folder ID in request`);
            throw new Error('Folder ID is required');
        }

        // Validation 2: Check if folderId is valid string
        if (typeof folderId !== 'string' || folderId.trim() === '') {
            console.log(`[ERROR] Invalid folder ID format:`, folderId);
            throw new Error('Folder ID must be a non-empty string');
        }

        console.log('✅ Basic validations passed\n');

        // Initialize Google Drive service
        const driveService = new GoogleDriveService();
        console.log('🔍 Validating folder access...');
        
        // This is where the 400 error might be coming from
        const validation = await driveService.validateFolderAccess(folderId);
        console.log('📋 Folder validation result:', validation);
        
        if (!validation.valid) {
            console.log('❌ VALIDATION FAILED - This would cause 400 error');
            console.log('Error details:', validation.error);
            throw new Error(`Invalid folder ID or access denied: ${validation.error}`);
        }

        console.log('✅ Folder validation passed\n');

        // Test linking (this would normally update the database)
        console.log('🔗 Testing folder linking logic...');
        const folderResult = await driveService.linkExistingFolder(
            uid, 
            folderId, 
            'TEST_USER'
        );
        
        console.log('📋 Link result:', folderResult);

        if (folderResult.success) {
            console.log('✅ SUCCESS! All server logic would work correctly');
        } else {
            console.log('❌ FAILED: Linking logic failed');
        }

    } catch (error) {
        console.error('❌ Server endpoint logic failed:', error.message);
        console.error('Full error:', error);
    }
}

testServerEndpointLogic();