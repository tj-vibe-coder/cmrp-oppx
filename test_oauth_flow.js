const { google } = require('googleapis');
require('dotenv').config();

async function testOAuthFlow() {
  console.log('🧪 Testing OAuth Flow with Google API');
  console.log('====================================');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
  );

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', 
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });

  console.log('\n📋 Steps to test:');
  console.log('1. Open this URL in your browser:');
  console.log(`   ${authUrl}`);
  console.log('\n2. Complete Google authorization');
  console.log('3. After redirect, copy the "code" parameter from the URL');
  console.log('4. Run: node test_oauth_flow.js <authorization_code>');
  console.log('\nExample:');
  console.log('   node test_oauth_flow.js 4/0AanL8L9k3...');

  // If authorization code provided as argument
  const authCode = process.argv[2];
  if (authCode) {
    console.log('\n🔄 Testing authorization code exchange...');
    console.log(`📝 Authorization code length: ${authCode.length}`);
    
    try {
      // Test the actual token exchange
      console.log('📞 Calling Google getAccessToken...');
      
      const response = await oauth2Client.getAccessToken({
        code: authCode
      });
      
      console.log('📝 Response type:', typeof response);
      console.log('📝 Response is null/undefined:', !response);
      console.log('📝 Response has tokens:', !!(response && response.tokens));
      
      if (response && response.tokens) {
        console.log('✅ SUCCESS! Tokens received:');
        console.log('   Access token:', !!response.tokens.access_token);
        console.log('   Refresh token:', !!response.tokens.refresh_token);
        console.log('   Expires in:', response.tokens.expires_in || 'not specified');
        
        // Test calendar API access
        oauth2Client.setCredentials(response.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        try {
          const calendarList = await calendar.calendarList.list();
          console.log('✅ Calendar API test successful!');
          console.log(`   Found ${calendarList.data.items?.length || 0} calendars`);
        } catch (calendarError) {
          console.log('❌ Calendar API test failed:', calendarError.message);
        }
        
      } else {
        console.log('❌ FAILED: Empty or invalid response from Google');
        console.log('   This usually means:');
        console.log('   - Authorization code already used');
        console.log('   - Authorization code expired (>10 min old)');
        console.log('   - Redirect URI mismatch in Google Cloud Console');
        console.log('   - Calendar API not enabled');
      }
      
    } catch (error) {
      console.log('❌ OAUTH ERROR:', error.message);
      console.log('📝 Error details:', error.response?.data || 'No additional details');
      
      if (error.message.includes('redirect_uri_mismatch')) {
        console.log('\n🔧 FIX: Redirect URI mismatch!');
        console.log('   Add this exact URI to Google Cloud Console:');
        console.log(`   ${process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'}`);
      }
      
      if (error.message.includes('invalid_grant')) {
        console.log('\n🔧 FIX: Authorization code issue!');
        console.log('   - Code already used (codes can only be used once)');
        console.log('   - Code expired (codes expire after ~10 minutes)');
        console.log('   - Get a fresh authorization code');
      }
    }
  }
}

testOAuthFlow().catch(console.error);