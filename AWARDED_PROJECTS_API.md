# Awarded Projects API - For Other App Integration

This document describes how your other app can fetch newly awarded projects from this database.

## Overview

When a project's status changes to **OP100** (awarded), it becomes available for your other app to fetch. The system tracks which projects have been synced to prevent duplicates.

## Setup

### 1. Run Migration

First, run the migration to add the sync tracking column:

```bash
node run_migration_014.js
```

This will:
- Add `synced_to_other_app` column to `opps_monitoring` table
- Create an index for faster queries
- Create a `awarded_projects` database view

### 2. Database View (Direct SQL Access)

If your other app connects directly to the same database, you can query:

```sql
-- Get all awarded projects
SELECT * FROM awarded_projects;

-- Get only unsynced awarded projects
SELECT * FROM awarded_projects WHERE synced_to_other_app = 0 OR synced_to_other_app IS NULL;
```

## API Endpoints

### GET /api/awarded-projects

Fetch awarded projects (OP100 status).

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `synced_only` (optional): `"false"` to get only unsynced projects (default), `"true"` to get all
- `limit` (optional): Maximum number of projects to return (default: 100)

**Example Request:**
```bash
curl -X GET "https://your-app.com/api/awarded-projects?synced_only=false&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "projects": [
    {
      "uid": "abc-123-def",
      "project_code": "CMRP26010001",
      "project_name": "New Office Building",
      "client": "ABC Corp",
      "account_mgr": "John Doe",
      "pic": "Jane Smith",
      "final_amt": 5000000.00,
      "margin": 15.5,
      "date_awarded_lost": "2026-01-15",
      "opp_status": "OP100",
      "google_drive_folder_id": "folder-id-here",
      "google_drive_folder_url": "https://drive.google.com/...",
      ...
    }
  ]
}
```

### POST /api/awarded-projects/mark-synced

Mark projects as synced after your app has processed them.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "uids": ["uid-1", "uid-2", "uid-3"]
}
```

**Example Request:**
```bash
curl -X POST "https://your-app.com/api/awarded-projects/mark-synced" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uids": ["abc-123", "def-456"]}'
```

**Response:**
```json
{
  "success": true,
  "updated": 2,
  "message": "Marked 2 awarded project(s) as synced"
}
```

## Workflow for Your Other App

### Option 1: Polling (Recommended)

Set up a scheduled job (e.g., every 5-10 minutes) to:

1. **Fetch unsynced awarded projects:**
   ```javascript
   const response = await fetch('https://cmrp-app.com/api/awarded-projects?synced_only=false', {
     headers: { 'Authorization': `Bearer ${token}` }
   });
   const { projects } = await response.json();
   ```

2. **Process each project** (save to your app's database, create records, etc.)

3. **Mark as synced:**
   ```javascript
   const uids = projects.map(p => p.uid);
   await fetch('https://cmrp-app.com/api/awarded-projects/mark-synced', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({ uids })
   });
   ```

### Option 2: Direct Database Query

If both apps share the same database:

```sql
-- Fetch unsynced awarded projects
SELECT * FROM awarded_projects 
WHERE synced_to_other_app = 0 OR synced_to_other_app IS NULL
ORDER BY date_awarded_lost DESC;

-- After processing, mark as synced
UPDATE opps_monitoring 
SET synced_to_other_app = 1 
WHERE uid IN ('uid-1', 'uid-2', 'uid-3')
  AND UPPER(opp_status) = 'OP100';
```

## Automatic Behavior

- When a project's `opp_status` changes to **OP100**, the `synced_to_other_app` flag is automatically reset to `0`
- This ensures newly awarded projects are always available for sync
- Projects remain in the database; they're just marked as synced to prevent duplicate processing

## Field Descriptions

| Field | Description |
|-------|-------------|
| `uid` | Unique identifier for the opportunity |
| `project_code` | Project code (e.g., CMRP26010001) |
| `project_name` | Name of the project |
| `client` | Client name |
| `account_mgr` | Account manager name |
| `pic` | Person in charge |
| `final_amt` | Final amount (awarded value) |
| `margin` | Margin percentage |
| `date_awarded_lost` | Date when project was awarded |
| `opp_status` | Status (should be "OP100" for awarded) |
| `google_drive_folder_id` | Google Drive folder ID (if linked) |
| `google_drive_folder_url` | Google Drive folder URL |
| `synced_to_other_app` | Sync flag (0 = not synced, 1 = synced) |

## Error Handling

- If `synced_to_other_app` column doesn't exist, the API will still work but won't filter by sync status
- Run `node run_migration_014.js` to add the column
- The API gracefully handles missing columns and returns all awarded projects

## Testing

Test the endpoints:

```bash
# Get unsynced awarded projects
curl -X GET "http://localhost:3000/api/awarded-projects?synced_only=false" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN"

# Mark projects as synced
curl -X POST "http://localhost:3000/api/awarded-projects/mark-synced" \
  -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uids": ["test-uid-1"]}'
```
