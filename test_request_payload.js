// Test script to check what we're sending to the server
const opportunityUid = '453c5db8-3bb0-415c-beef-aadb3b760436';
const folderUrl = 'https://drive.google.com/drive/folders/0BwLYHtwPeCSpX0ZYU1EwTUhsOEk?resourcekey=0-3m-OlBAKq2SQCj7i4wx0yg&usp=drive_link';

// Extract folder ID like the frontend does
let folderId = folderUrl;
if (folderId.includes('drive.google.com/drive/folders/')) {
    const urlParts = folderId.split('/folders/');
    if (urlParts.length > 1) {
        folderId = urlParts[1].split('?')[0];
    }
}

console.log('Original URL:', folderUrl);
console.log('Extracted folder ID:', folderId);
console.log('Folder ID length:', folderId.length);
console.log('Folder ID type:', typeof folderId);
console.log('Is empty after trim?', folderId.trim() === '');

// Test the request payload
const requestPayload = { folderId };
console.log('Request payload:', JSON.stringify(requestPayload, null, 2));

// Validate like the server does
if (!folderId) {
    console.log('❌ SERVER WOULD REJECT: Missing folder ID');
} else if (typeof folderId !== 'string' || folderId.trim() === '') {
    console.log('❌ SERVER WOULD REJECT: Invalid folder ID format');
} else {
    console.log('✅ SERVER SHOULD ACCEPT: Folder ID looks valid');
}