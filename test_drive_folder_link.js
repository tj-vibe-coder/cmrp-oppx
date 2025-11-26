const fetch = require('node-fetch');

async function testDriveFolderLink() {
  console.log('🧪 Testing Drive Folder Link API...');

  const API_BASE = 'http://localhost:3000';
  const TEST_UID = '453c5db8-3bb0-415c-beef-aadb3b760436';
  const TEST_FOLDER_ID = '1GCxXtOK8hajRl9MpJR709fjX8_Zc-OxX'; // Example folder ID

  // First, let's test with a valid token
  try {
    console.log('1️⃣ Testing with test folder ID:', TEST_FOLDER_ID);
    
    // You'll need to replace this with a valid token from your browser
    const testToken = 'your_token_here'; // Get this from localStorage in browser
    
    const response = await fetch(`${API_BASE}/api/opportunities/${TEST_UID}/drive-folder`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        folderId: TEST_FOLDER_ID 
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers));

    const data = await response.text();
    console.log('📋 Response body:', data);

    if (response.ok) {
      console.log('✅ API call successful!');
    } else {
      console.log('❌ API call failed');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n📝 To test properly:');
  console.log('1. Open browser dev tools on http://localhost:3000');
  console.log('2. Run: localStorage.getItem("authToken")');
  console.log('3. Copy the token and replace "your_token_here" in this script');
  console.log('4. Get a valid folder ID from Google Drive URL');
}

// Test folder ID extraction
function extractFolderIdFromUrl(url) {
  console.log('\n🔍 Testing folder ID extraction...');
  
  const testUrls = [
    'https://drive.google.com/drive/folders/1GCxXtOK8hajRl9MpJR709fjX8_Zc-OxX',
    'https://drive.google.com/drive/folders/0BwLYHtwPeCSpX0ZYU1EwTUhsOEk?resourcekey=0-3m-OlBAKq2SQCj7i4wx0yg&usp=drive_link',
    '1GCxXtOK8hajRl9MpJR709fjX8_Zc-OxX'
  ];

  testUrls.forEach(url => {
    let folderId;
    if (url.includes('drive.google.com/drive/folders/')) {
      folderId = url.split('/folders/')[1].split('?')[0];
    } else if (url.match(/^[a-zA-Z0-9_-]+$/)) {
      folderId = url;
    }
    
    console.log(`URL: ${url}`);
    console.log(`Extracted ID: ${folderId}`);
    console.log(`Valid format: ${folderId && folderId.length > 10 ? '✅' : '❌'}\n`);
  });
}

testDriveFolderLink();
extractFolderIdFromUrl();