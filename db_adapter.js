/**
 * Database Adapter for PostgreSQL and SQLiteCloud
 * This module provides a unified interface for database operations
 */

require('dotenv').config();

let db = null;
let dbType = null;

/**
 * Initialize database connection based on DATABASE_URL
 */
async function initDatabase() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.warn('⚠️  No DATABASE_URL found. Using mock data.');
        return null;
    }

    if (databaseUrl.startsWith('sqlitecloud://')) {
        // SQLiteCloud connection
        const { Database } = require('@sqlitecloud/drivers');
        db = new Database(databaseUrl);
        await db.sql`PRAGMA foreign_keys = ON`;
        dbType = 'sqlitecloud';
        console.log('✅ Connected to SQLiteCloud');
    } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        // PostgreSQL connection
        const { Pool } = require('pg');
        db = new Pool({ connectionString: databaseUrl });
        await db.query('SELECT NOW()'); // Test connection
        dbType = 'postgresql';
        console.log('✅ Connected to PostgreSQL');
    } else {
        throw new Error('Unsupported database URL format');
    }

    return db;
}

/**
 * Execute a SQL query with unified interface
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }

    if (dbType === 'sqlitecloud') {
        // SQLiteCloud query
        try {
            const result = await db.sql(sql, ...params);

            // Normalize result format to match PostgreSQL
            if (Array.isArray(result)) {
                return {
                    rows: result,
                    rowCount: result.length
                };
            }

            return {
                rows: [],
                rowCount: result.changes || 0,
                lastID: result.lastID
            };
        } catch (error) {
            console.error('SQLiteCloud query error:', error);
            throw error;
        }
    } else if (dbType === 'postgresql') {
        // PostgreSQL query
        return await db.query(sql, params);
    }
}

/**
 * Execute a transaction
 * @param {Function} callback - Async function to execute in transaction
 */
async function transaction(callback) {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }

    if (dbType === 'sqlitecloud') {
        await query('BEGIN TRANSACTION');
        try {
            await callback(query);
            await query('COMMIT');
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
    } else if (dbType === 'postgresql') {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            await callback((sql, params) => client.query(sql, params));
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

/**
 * Get a client for connection pooling (PostgreSQL only)
 * For SQLiteCloud, returns a query wrapper
 */
async function getClient() {
    if (dbType === 'postgresql') {
        return await db.connect();
    } else if (dbType === 'sqlitecloud') {
        // Return a query wrapper for SQLiteCloud
        return {
            query: query,
            release: () => {} // No-op for SQLiteCloud
        };
    }
}

/**
 * Close database connection
 */
async function close() {
    if (db) {
        if (dbType === 'postgresql') {
            await db.end();
        } else if (dbType === 'sqlitecloud') {
            db.close();
        }
        console.log('✅ Database connection closed');
    }
}

/**
 * Get raw database instance
 */
function getDB() {
    return db;
}

/**
 * Get database type
 */
function getDBType() {
    return dbType;
}

/**
 * Helper to convert PostgreSQL-specific SQL to SQLite-compatible SQL
 * @param {string} sql - PostgreSQL SQL
 * @returns {string} SQLite-compatible SQL
 */
function convertSQL(sql) {
    if (dbType !== 'sqlitecloud') {
        return sql;
    }

    let converted = sql;

    // Replace RETURNING * with SQLite equivalent (will need to fetch last insert id)
    converted = converted.replace(/RETURNING \*/gi, '');

    // Replace gen_random_uuid() with a placeholder (handle in app)
    converted = converted.replace(/gen_random_uuid\(\)/gi, '?');

    // Replace NOW() with datetime('now')
    converted = converted.replace(/NOW\(\)/gi, "datetime('now')");
    converted = converted.replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");

    // Replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT
    converted = converted.replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');

    // Replace BOOLEAN type
    converted = converted.replace(/BOOLEAN/gi, 'INTEGER');

    // Replace UUID type
    converted = converted.replace(/UUID/gi, 'TEXT');

    // Replace JSONB with JSON (SQLite stores as TEXT)
    converted = converted.replace(/JSONB/gi, 'TEXT');

    // Replace TEXT[] with TEXT (arrays stored as JSON strings)
    converted = converted.replace(/TEXT\[\]/gi, 'TEXT');

    return converted;
}

module.exports = {
    initDatabase,
    query,
    transaction,
    getClient,
    close,
    getDB,
    getDBType,
    convertSQL
};
