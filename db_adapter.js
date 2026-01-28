/**
 * Database Adapter for PostgreSQL, SQLiteCloud, and Local SQLite
 * This module provides a unified interface for database operations
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

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
    } else if (databaseUrl.startsWith('sqlite://') || databaseUrl.startsWith('sqlite:')) {
        // Local SQLite file connection
        const Database = require('better-sqlite3');
        let dbPath = databaseUrl.replace(/^sqlite:\/\/?/, '');
        
        // Resolve relative paths
        if (!path.isAbsolute(dbPath)) {
            dbPath = path.resolve(process.cwd(), dbPath);
        }
        
        // Create directory if it doesn't exist
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        dbType = 'sqlite';
        console.log(`✅ Connected to local SQLite database: ${dbPath}`);
    } else if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        // PostgreSQL connection
        const { Pool } = require('pg');
        db = new Pool({ connectionString: databaseUrl });
        await db.query('SELECT NOW()'); // Test connection
        dbType = 'postgresql';
        console.log('✅ Connected to PostgreSQL');
    } else if (!databaseUrl.includes('://') && (databaseUrl.endsWith('.db') || databaseUrl.endsWith('.sqlite'))) {
        // Direct file path (e.g., ./database.db)
        const Database = require('better-sqlite3');
        let dbPath = databaseUrl;
        
        // Resolve relative paths
        if (!path.isAbsolute(dbPath)) {
            dbPath = path.resolve(process.cwd(), dbPath);
        }
        
        // Create directory if it doesn't exist
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        dbType = 'sqlite';
        console.log(`✅ Connected to local SQLite database: ${dbPath}`);
    } else {
        throw new Error(`Unsupported database URL format: ${databaseUrl}`);
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
            // Log UPDATE/INSERT/DELETE queries for debugging
            const isWriteQuery = /^\s*(UPDATE|INSERT|DELETE)/i.test(sql.trim());
            if (isWriteQuery) {
                console.log('[DB-ADAPTER] SQLiteCloud write query:', sql.substring(0, 200));
                console.log('[DB-ADAPTER] Params:', params);
            }
            
            let result;
            
            // SQLiteCloud supports both template literals and function calls
            // For queries without parameters, use the function call syntax
            if (params.length === 0) {
                // No parameters - use direct SQL string
                result = await db.sql(sql);
            } else {
                // Has parameters - use function call with spread
                result = await db.sql(sql, ...params);
            }

            // Normalize result format to match PostgreSQL
            // SQLiteCloud returns arrays for SELECT, but may return objects for INSERT/UPDATE/DELETE
            if (Array.isArray(result)) {
                // SELECT query - return rows
                if (isWriteQuery) {
                    console.log('[DB-ADAPTER] ⚠️ SQLiteCloud write query returned array (unexpected):', result.length, 'rows');
                    // For UPDATE/INSERT/DELETE, if we get an array, it might be empty or contain affected rows
                    // Check if it's actually a write result in array format
                    if (result.length === 0) {
                        // Empty array for write query - might mean success but no rows returned
                        console.log('[DB-ADAPTER] Empty array for write query - assuming success');
                        return {
                            rows: [],
                            rowCount: 1 // Assume 1 row affected if empty array
                        };
                    }
                }
                return {
                    rows: result,
                    rowCount: result.length
                };
            }

            // Handle result object (for INSERT/UPDATE/DELETE)
            if (result && typeof result === 'object' && !Array.isArray(result)) {
                // Check if it has changes property (UPDATE/DELETE) or lastID (INSERT)
                const rowCount = result.changes !== undefined ? result.changes : 
                                result.rowCount !== undefined ? result.rowCount : 
                                result.lastID !== undefined ? 1 : 0;
                
                if (isWriteQuery) {
                    console.log('[DB-ADAPTER] SQLiteCloud write query result object:', {
                        changes: result.changes,
                        rowCount: result.rowCount,
                        lastID: result.lastID || result.lastInsertRowid,
                        computedRowCount: rowCount,
                        fullResult: JSON.stringify(result).substring(0, 200)
                    });
                }
                
                return {
                    rows: [],
                    rowCount: rowCount,
                    lastID: result.lastID || result.lastInsertRowid
                };
            }

            // Handle null/undefined result (might mean success for write queries)
            if (result === null || result === undefined) {
                if (isWriteQuery) {
                    console.log('[DB-ADAPTER] SQLiteCloud write query returned null/undefined - assuming success');
                    return {
                        rows: [],
                        rowCount: 1 // Assume success
                    };
                }
            }

            if (isWriteQuery) {
                console.log('[DB-ADAPTER] ⚠️ SQLiteCloud query returned unexpected format:', typeof result, result);
            }
            return {
                rows: [],
                rowCount: 0
            };
        } catch (error) {
            console.error('[DB-ADAPTER] ❌ SQLiteCloud query error:', error.message);
            console.error('[DB-ADAPTER] SQL:', sql.substring(0, 200));
            console.error('[DB-ADAPTER] Params:', params);
            console.error('[DB-ADAPTER] Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack?.substring(0, 500)
            });
            throw error;
        }
    } else if (dbType === 'sqlite') {
        // Local SQLite query
        try {
            // Convert SQL for SQLite compatibility
            const convertedSql = convertSQL(sql);
            
            // Determine if this is a SELECT query
            const isSelect = /^\s*SELECT/i.test(convertedSql.trim());
            
            if (isSelect) {
                const stmt = db.prepare(convertedSql);
                const rows = stmt.all(...params);
                return {
                    rows: rows,
                    rowCount: rows.length
                };
            } else {
                // INSERT, UPDATE, DELETE
                const stmt = db.prepare(convertedSql);
                const result = stmt.run(...params);
                return {
                    rows: [],
                    rowCount: result.changes || 0,
                    lastID: result.lastInsertRowid
                };
            }
        } catch (error) {
            console.error('SQLite query error:', error);
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
        // SQLiteCloud: Use BEGIN TRANSACTION (required by SQLiteCloud)
        // SQLiteCloud Database object maintains transaction state across sequential db.sql() calls
        // All queries within the callback must use the same Database instance (db.sql)
        try {
            console.log('[DB-ADAPTER] Starting SQLiteCloud transaction...');
            await db.sql('BEGIN TRANSACTION');
            console.log('[DB-ADAPTER] ✅ SQLiteCloud transaction started');
            
            // Execute callback - all queries inside will be part of the transaction
            const result = await callback(query);
            
            console.log('[DB-ADAPTER] Committing SQLiteCloud transaction...');
            await db.sql('COMMIT');
            console.log('[DB-ADAPTER] ✅ SQLiteCloud transaction committed successfully');
            return result;
        } catch (error) {
            console.error('[DB-ADAPTER] ❌ SQLiteCloud transaction error:', error.message);
            console.error('[DB-ADAPTER] Stack:', error.stack);
            try {
                console.log('[DB-ADAPTER] Rolling back SQLiteCloud transaction...');
                await db.sql('ROLLBACK');
                console.log('[DB-ADAPTER] ✅ SQLiteCloud transaction rolled back');
            } catch (rollbackError) {
                console.error('[DB-ADAPTER] ❌ Rollback error:', rollbackError.message);
            }
            throw error;
        }
    } else if (dbType === 'sqlite') {
        // Local SQLite transaction
        db.exec('BEGIN TRANSACTION');
        try {
            await callback(query);
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
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
 * For SQLiteCloud and local SQLite, returns a query wrapper
 */
async function getClient() {
    if (dbType === 'postgresql') {
        return await db.connect();
    } else if (dbType === 'sqlitecloud' || dbType === 'sqlite') {
        // Return a query wrapper for SQLiteCloud and local SQLite
        return {
            query: query,
            release: () => {} // No-op for SQLite
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
        } else if (dbType === 'sqlitecloud' || dbType === 'sqlite') {
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
    if (dbType !== 'sqlitecloud' && dbType !== 'sqlite') {
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
