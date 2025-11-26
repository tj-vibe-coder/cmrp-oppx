#!/bin/bash

# Environment Management Script
# This script helps switch between development and production environments

set -e

ENV_FILE=".env"
BACKUP_FILE=".env.backup"

show_help() {
    echo "Environment Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev        Switch to development environment"
    echo "  prod       Switch to production environment"
    echo "  status     Show current environment status"
    echo "  backup     Backup current .env file"
    echo "  restore    Restore .env from backup"
    echo "  help       Show this help message"
    echo ""
}

show_status() {
    if [ -f "$ENV_FILE" ]; then
        echo "Current environment configuration:"
        echo "=================================="
        grep "NODE_ENV\|DATABASE_URL\|API_BASE_URL" "$ENV_FILE" | head -3
        echo ""
        echo "Environment variables loaded:"
        # Extract key variables safely
        NODE_ENV_VAL=$(grep "^NODE_ENV=" "$ENV_FILE" | cut -d'=' -f2)
        PORT_VAL=$(grep "^PORT=" "$ENV_FILE" | cut -d'=' -f2)
        echo "NODE_ENV: ${NODE_ENV_VAL:-'not set'}"
        echo "PORT: ${PORT_VAL:-'not set'}"
    else
        echo "❌ No .env file found!"
        echo "Run './env-manager.sh dev' to create development environment"
    fi
}

switch_to_dev() {
    echo "🔧 Switching to development environment..."
    
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo "📦 Backed up current .env to .env.backup"
    fi
    
    cp ".env.development" "$ENV_FILE"
    echo "✅ Switched to development environment"
    echo ""
    show_status
}

switch_to_prod() {
    echo "🚀 Switching to production environment..."
    
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo "📦 Backed up current .env to .env.backup"
    fi
    
    cp ".env.production" "$ENV_FILE"
    echo "✅ Switched to production environment"
    echo ""
    show_status
}

backup_env() {
    if [ -f "$ENV_FILE" ]; then
        cp "$ENV_FILE" "$BACKUP_FILE"
        echo "✅ Backed up $ENV_FILE to $BACKUP_FILE"
    else
        echo "❌ No .env file to backup"
    fi
}

restore_env() {
    if [ -f "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$ENV_FILE"
        echo "✅ Restored .env from backup"
        show_status
    else
        echo "❌ No backup file found"
    fi
}

# Main script logic
case "$1" in
    "dev")
        switch_to_dev
        ;;
    "prod")
        switch_to_prod
        ;;
    "status")
        show_status
        ;;
    "backup")
        backup_env
        ;;
    "restore")
        restore_env
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
