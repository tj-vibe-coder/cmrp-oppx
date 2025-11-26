#!/bin/bash

# 🚀 CMRP Opportunities Management - Production Deployment Script
# This script automates the deployment process to prevent branch confusion

set -e  # Exit on any error

echo "🚀 CMRP Production Deployment Script"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Verify we're in the correct directory
print_status "Verifying we're in the correct directory..."
if [ ! -f "package.json" ] && [ ! -f "server.js" ]; then
    print_error "Not in the correct project directory!"
    print_error "Please run this script from the CMRP Opps Management directory"
    exit 1
fi
print_success "Correct directory confirmed"

# Step 2: Check git status
print_status "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes!"
    git status --short
    echo ""
    read -p "Do you want to commit these changes first? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enter commit message:"
        read -r COMMIT_MSG
        git add .
        git commit -m "$COMMIT_MSG"
        print_success "Changes committed"
    else
        print_warning "Proceeding with uncommitted changes (they won't be deployed)"
    fi
fi

# Step 3: Ensure we're on main branch
print_status "Ensuring we're on main branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Currently on branch: $CURRENT_BRANCH"
    print_status "Switching to main branch..."
    git checkout main
fi
print_success "On main branch"

# Step 4: Pull latest changes from main
print_status "Pulling latest changes from origin/main..."
git pull origin main
print_success "Main branch updated"

# Step 5: Get current commit info for logging
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
COMMIT_AUTHOR=$(git log -1 --pretty=format:"%an")
CURRENT_DATE=$(date '+%Y-%m-%d %H:%M:%S')

print_status "Deployment Details:"
echo "  📅 Date: $CURRENT_DATE"
echo "  👤 Author: $COMMIT_AUTHOR"
echo "  🔗 Commit: $COMMIT_HASH"
echo "  📝 Message: $COMMIT_MSG"
echo ""

# Step 6: Confirm deployment
read -p "🚀 Ready to deploy to production? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled by user"
    exit 0
fi

# Step 7: Switch to master branch
print_status "Switching to master branch..."
git checkout master

# Step 8: Merge main into master
print_status "Merging main branch into master..."
if git merge main --no-edit; then
    print_success "Merge completed successfully"
else
    print_error "Merge failed! Please resolve conflicts manually and try again"
    print_error "Run: git status to see conflicts"
    exit 1
fi

# Step 9: Push to origin/master (triggers production deployment)
print_status "Pushing to origin/master to trigger production deployment..."
if git push origin master; then
    print_success "Successfully pushed to production branch!"
else
    print_error "Push to master failed!"
    exit 1
fi

# Step 10: Switch back to main branch for continued development
print_status "Switching back to main branch for continued development..."
git checkout main
print_success "Returned to main branch"

# Step 11: Log the deployment
DEPLOYMENT_LOG="deployments.log"
echo "[$CURRENT_DATE] DEPLOYMENT - Commit: $COMMIT_HASH | Author: $COMMIT_AUTHOR | Message: $COMMIT_MSG" >> "$DEPLOYMENT_LOG"

# Step 12: Display success message and next steps
echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "====================================="
echo ""
print_success "Production deployment has been triggered"
print_status "Next steps:"
echo "  1. 🔍 Check your deployment platform for build status"
echo "  2. 🌐 Verify changes are live on production site"
echo "  3. 🧪 Test key functionality in production"
echo "  4. 📊 Monitor for any deployment errors"
echo ""
print_status "Deployment logged to: $DEPLOYMENT_LOG"
echo ""
print_warning "If you encounter issues, check the DEPLOYMENT_PROCESS_GUIDE.md for troubleshooting"
echo ""
