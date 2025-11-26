const GoogleDriveService = require('./google_drive_service');

async function testDriveAPIFix() {
  console.log('🔧 Testing Google Drive API after enabling...\n');

  try {
    const service = new GoogleDriveService();
    await service.initialize();
    
    console.log('✅ Service initialized successfully');
    
    // Test 1: List files (basic API access)
    console.log('\n1️⃣ Testing basic Drive API access...');
    const listResponse = await service.drive.files.list({
      pageSize: 5,
      fields: 'files(id, name, mimeType)'
    });
    
    console.log(`✅ API access working! Found ${listResponse.data.files.length} files/folders`);
    listResponse.data.files.forEach(file => {
      console.log(`   - ${file.name} (${file.mimeType})`);
    });
    
    // Test 2: Test folder creation (if root folder is set)
    console.log('\n2️⃣ Testing folder creation...');
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    
    if (rootFolderId) {
      console.log(`📁 Using root folder: ${rootFolderId}`);
      
      // Test creating a folder
      const testFolder = await service.drive.files.create({
        resource: {
          name: 'CMRP-Test-Folder-' + Date.now(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolderId]
        },
        fields: 'id, name, webViewLink'
      });
      
      console.log('✅ Test folder created successfully!');
      console.log(`   - ID: ${testFolder.data.id}`);
      console.log(`   - Name: ${testFolder.data.name}`);
      console.log(`   - Link: ${testFolder.data.webViewLink}`);
      
      // Clean up test folder
      await service.drive.files.delete({ fileId: testFolder.data.id });
      console.log('🗑️ Test folder cleaned up');
      
    } else {
      console.log('⚠️ No root folder ID set - skipping folder creation test');
      console.log('💡 Set GOOGLE_DRIVE_ROOT_FOLDER_ID in .env for organized folder structure');
    }
    
    console.log('\n🎉 Google Drive API is working correctly!');
    console.log('\n📝 Next steps:');
    console.log('   1. ✅ Google Drive API enabled');
    console.log('   2. ✅ Service account authentication working');
    console.log('   3. 🔄 Try creating/linking folders in your app');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 403) {
      console.error('\n🔧 Still getting 403? Try these steps:');
      console.error('   1. Wait 5-10 minutes after enabling the API');
      console.error('   2. Check service account permissions');
      console.error('   3. Create a shared folder and add the service account');
    } else if (error.code === 404) {
      console.error('\n🔧 Folder not found? Check:');
      console.error('   1. Root folder ID is correct');
      console.error('   2. Service account has access to the folder');
    } else {
      console.error('\n🔧 Other error - check:');
      console.error('   1. Internet connection');
      console.error('   2. Google credentials file');
      console.error('   3. Project quotas and limits');
    }
  }
}

testDriveAPIFix();