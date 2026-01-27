/**
 * Initialize local SQLite database with schema
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_URL 
    ? process.env.DATABASE_URL.replace(/^sqlite:\/\/?/, '')
    : './database.db';

// Resolve absolute path
const absolutePath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

console.log(`📦 Initializing SQLite database at: ${absolutePath}`);

// Read schema file
const schemaPath = path.join(__dirname, 'sqlite_schema.sql');
if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}`);
    process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// Connect to database
const db = new Database(absolutePath);

try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Split schema by semicolons and execute each statement
    const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    let executed = 0;
    for (const statement of statements) {
        try {
            if (statement.trim()) {
                db.exec(statement);
                executed++;
            }
        } catch (error) {
            // Ignore "table already exists" errors
            if (!error.message.includes('already exists')) {
                console.warn(`⚠️  Warning executing statement: ${error.message}`);
            }
        }
    }
    
    console.log(`✅ Successfully executed ${executed} statements`);
    console.log(`✅ Database initialized successfully!`);
    
    // Verify tables were created
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`\n📊 Created ${tables.length} tables:`);
    tables.forEach(table => {
        console.log(`   - ${table.name}`);
    });
    
} catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
} finally {
    db.close();
}
