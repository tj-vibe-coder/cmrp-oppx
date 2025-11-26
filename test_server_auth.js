const GoogleDriveService = require('./google_drive_service');

async function testServerSideAuth() {
  console.log('🔍 Testing server-side Google Drive authentication...');
  
  try {
    const driveService = new GoogleDriveService();
    console.log('Initializing service...');
    const initialized = await driveService.initialize();
    
    if (!initialized) {
      throw new Error('Failed to initialize Drive service');
    }
    
    console.log('✅ Drive service initialized');
    
    // Test basic API access
    console.log('Testing basic API access...');
    const listResponse = await driveService.drive.files.list({
      pageSize: 3,
      fields: 'files(id, name)'
    });
    console.log('✅ Basic API access working');
    
    console.log('Testing folder creation with actual opportunity data...');
    
    // Mock opportunity data like what the server receives
    const mockOpportunity = {
      uid: '453c5db8-3bb0-415c-beef-aadb3b760436',
      project_name: 'Test Project',
      project_code: 'CMRP25010001',
      client: 'Test Client'
    };
    
    const result = await driveService.createFolderForOpportunity(mockOpportunity, 'Test User');
    console.log('✅ Server-side folder creation successful:', result);
    
    // Clean up
    if (result.id) {
      await driveService.drive.files.delete({ fileId: result.id });
      console.log('🗑️ Test folder cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Server-side error:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.code === 403) {
      console.error('\n🔧 403 Forbidden - Check:');
      console.error('1. Google Drive API is enabled');
      console.error('2. Service account email is shared on the folder');
      console.error('3. Credentials file is correct');
    }
  }
}

testServerSideAuth();