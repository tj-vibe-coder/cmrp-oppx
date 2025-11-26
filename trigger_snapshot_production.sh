#!/bin/bash
# Trigger Weekly Snapshot in Production
# Run this after deployment completes

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYxYzc3N2RmLTY1MGUtNDM0Yi1hNTM5LTdjZmZkY2YwMGUwZiIsImVtYWlsIjoicmV1ZWwucml2ZXJhQGNtcnBhdXRvbWF0aW9uLmNvbSIsIm5hbWUiOiJSSlIiLCJyb2xlcyI6WyJEUyJdLCJhY2NvdW50VHlwZSI6IkFkbWluIiwiaWF0IjoxNzYxNTQ1Nzc1LCJleHAiOjE3NjE2MzIxNzV9.7CQmFwOk_dsHlzJ8hEQXqkknSgyl_SrPRcOPFfQJ06c"

echo "🔄 Triggering Weekly Snapshot in Production..."
echo "================================================"
echo ""

response=$(curl -X POST https://cmrp-opps-backend.onrender.com/api/snapshots/business/weekly-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"Manual trigger - Monday schedule with cumulative submitted count"}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | grep -v "HTTP_STATUS")

if [ "$http_status" = "200" ]; then
    echo "✅ SUCCESS!"
    echo ""
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    echo ""
    echo "✨ Weekly snapshot created successfully!"
    echo "📊 You can now refresh the executive dashboard"
else
    echo "❌ FAILED (HTTP $http_status)"
    echo ""
    echo "$body"
    echo ""
    echo "⚠️  Deployment may still be in progress. Wait a few minutes and try again."
fi
