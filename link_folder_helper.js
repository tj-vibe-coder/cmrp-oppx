/**
 * Helper script to link a Google Drive folder to an opportunity
 * Usage: node link_folder_helper.js <opportunity_uid> <folder_id>
 * Example: node link_folder_helper.js abc123 1RxDz-i3_86zzRJ8zBLNQN0lS-BqwbdYX
 */

require('dotenv').config();
const db = require('./db_adapter');
const GoogleDriveService = require('./google_drive_service');

async function linkFolder(opportunityUid, folderId) {
    console.log('🔗 Linking Google Drive folder to opportunity');
    console.log('================================================');
    console.log('Opportunity UID:', opportunityUid);
    console.log('Folder ID:', folderId);
    console.log('');

    try {
        // Initialize database
        await db.initDatabase();
        console.log('✅ Database initialized');

        // Check if opportunity exists
        const oppResult = await db.query(
            'SELECT uid, project_code, project_name, google_drive_folder_id FROM opps_monitoring WHERE uid = ?',
            [opportunityUid]
        );

        if (oppResult.rows.length === 0) {
            console.error('❌ Opportunity not found:', opportunityUid);
            process.exit(1);
        }

        const opportunity = oppResult.rows[0];
        console.log('✅ Opportunity found:', opportunity.project_code, '-', opportunity.project_name);

        if (opportunity.google_drive_folder_id) {
            console.log('⚠️  Opportunity already has a linked folder:', opportunity.google_drive_folder_id);
            console.log('   Use the unlink function first if you want to change it.');
            process.exit(1);
        }

        // Initialize Google Drive service
        const driveService = new GoogleDriveService();
        const initialized = await driveService.initialize();
        
        if (!initialized) {
            console.error('❌ Failed to initialize Google Drive service');
            process.exit(1);
        }
        console.log('✅ Google Drive service initialized');

        // Validate folder access
        console.log('\n🔍 Validating folder access...');
        const validation = await driveService.validateFolderAccess(folderId);
        
        if (!validation.valid) {
            console.error('❌ Folder access error:', validation.error);
            console.error('\n💡 Solution: Share the folder with the service account:');
            console.error('   tj-caballero@app-attachment.iam.gserviceaccount.com');
            process.exit(1);
        }
        console.log('✅ Folder is accessible');

        // Get folder info
        const folderInfo = await driveService.getFolderInfo(folderId);
        console.log('✅ Folder found:', folderInfo.name);
        console.log('   URL:', folderInfo.webViewLink);

        // Link the folder
        console.log('\n🔗 Linking folder to opportunity...');
        const result = await driveService.linkExistingFolder(
            opportunityUid,
            folderId,
            'SYSTEM (via script)'
        );

        console.log('\n✅ Successfully linked folder!');
        console.log('   Folder ID:', result.id);
        console.log('   Folder Name:', result.name);
        console.log('   Folder URL:', result.url);

        await db.close();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await db.close();
        process.exit(1);
    }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('Usage: node link_folder_helper.js <opportunity_uid> <folder_id>');
    console.error('');
    console.error('Example:');
    console.error('  node link_folder_helper.js abc-123-def 1RxDz-i3_86zzRJ8zBLNQN0lS-BqwbdYX');
    console.error('');
    console.error('To find the opportunity UID:');
    console.error('  - Check the opportunity in the app');
    console.error('  - Or query the database: SELECT uid, project_code FROM opps_monitoring');
    process.exit(1);
}

const [opportunityUid, folderId] = args;
linkFolder(opportunityUid, folderId);
