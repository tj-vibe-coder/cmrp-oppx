# Google Drive Sync Error - Fix Guide

## Problem
You're getting this error:
```
Sync failed: Connection error: Unable to sync from Google Drive. 
Please check your network connection and ensure the server is running, then try again.
```

## Root Cause
The Google Drive service is missing authentication credentials. The service needs either:
1. `GOOGLE_SERVICE_ACCOUNT_KEY` environment variable, OR
2. A `google-drive-credentials.json` file

## Solution

### Option 1: Use Environment Variable (Recommended for Production)

1. **Get your Google Service Account credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Create or select a service account
   - Create a new JSON key and download it

2. **Add to `.env` file:**
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```
   
   **Important:** The entire JSON must be on a single line and wrapped in single quotes.

3. **Restart your server**

### Option 2: Use Credentials File (For Local Development)

1. **Get your Google Service Account credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "IAM & Admin" > "Service Accounts"
   - Create or select a service account
   - Create a new JSON key and download it

2. **Save the file:**
   - Rename the downloaded file to `google-drive-credentials.json`
   - Place it in the project root directory (`/Users/tjc/OppX/cmrp-oppx/`)

3. **Ensure the file is in `.gitignore`** (it should already be there)

4. **Restart your server**

## Verify the Fix

Run the diagnostic script:
```bash
node diagnose_google_drive.js
```

You should see:
- ✅ GOOGLE_SERVICE_ACCOUNT_KEY is set (or credentials file exists)
- ✅ Google Drive service initialized successfully
- ✅ Google Drive API connection successful

## Additional Requirements

After setting up credentials, ensure:

1. **Drive API is enabled:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API" and enable it

2. **Service account has proper permissions:**
   - The service account needs access to the Google Drive folders you're syncing
   - Share the folders with the service account email (found in credentials)

3. **Required scopes are enabled:**
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/drive.metadata`

## Testing

After fixing, try syncing again. The sync should now work properly.

## Troubleshooting

If you still get errors after setting up credentials:

1. **Check server logs** for detailed error messages
2. **Verify service account email** has access to the Drive folders
3. **Test API connection** using the diagnostic script
4. **Check network connectivity** to Google APIs
