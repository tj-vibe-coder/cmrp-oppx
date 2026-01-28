/**
 * Migrate schema + data from one SQLiteCloud DB to another.
 *
 * Usage:
 *   node migrate_sqlitecloud_to_sqlitecloud.js --target "sqlitecloud://..." [--source "sqlitecloud://..."] [--drop]
 *
 * Defaults:
 *   --source defaults to process.env.DATABASE_URL (dotenv loaded)
 *
 * Safety:
 *   If target has existing user tables, the script will abort unless --drop is provided.
 */
require('dotenv').config();

const { Database } = require('@sqlitecloud/drivers');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'drop') {
      args.drop = true;
      continue;
    }
    const val = argv[i + 1];
    if (val && !val.startsWith('--')) {
      args[key] = val;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function normalizeValue(v) {
  if (v === undefined) return null;
  if (v === null) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  // sqlitecloud driver typically returns strings/numbers; but defensively stringify objects/arrays
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

async function getUserTables(db) {
  const rows = await db.sql(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
     ORDER BY name`
  );
  return Array.isArray(rows) ? rows.map(r => r.name) : [];
}

async function getSchemaObjects(sourceDb) {
  const rows = await sourceDb.sql(
    `SELECT type, name, tbl_name, sql
     FROM sqlite_master
     WHERE sql IS NOT NULL
       AND name NOT LIKE 'sqlite_%'
     ORDER BY
       CASE type
         WHEN 'table' THEN 0
         WHEN 'index' THEN 1
         WHEN 'trigger' THEN 2
         WHEN 'view' THEN 3
         ELSE 4
       END,
       name`
  );
  return Array.isArray(rows) ? rows : [];
}

async function getTableColumns(db, tableName) {
  const rows = await db.sql(`PRAGMA table_info(${quoteIdent(tableName)})`);
  if (!Array.isArray(rows)) return [];
  // pragma table_info returns: cid, name, type, notnull, dflt_value, pk
  return rows.map(r => r.name);
}

async function countRows(db, tableName) {
  const rows = await db.sql(`SELECT COUNT(*) AS cnt FROM ${quoteIdent(tableName)}`);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? Number(row.cnt) : 0;
}

async function dropTargetObjects(targetDb) {
  const objs = await targetDb.sql(
    `SELECT type, name, sql
     FROM sqlite_master
     WHERE name NOT LIKE 'sqlite_%'
       AND type IN ('view','trigger','index','table')
     ORDER BY
       CASE type
         WHEN 'view' THEN 0
         WHEN 'trigger' THEN 1
         WHEN 'index' THEN 2
         WHEN 'table' THEN 3
         ELSE 4
       END`
  );
  if (!Array.isArray(objs) || objs.length === 0) return;

  // Drop in a safe order to reduce dependency errors
  for (const o of objs) {
    const type = o.type;
    const name = o.name;
    if (!name) continue;
    const stmt =
      type === 'view' ? `DROP VIEW IF EXISTS ${quoteIdent(name)};` :
      type === 'trigger' ? `DROP TRIGGER IF EXISTS ${quoteIdent(name)};` :
      type === 'index' ? `DROP INDEX IF EXISTS ${quoteIdent(name)};` :
      type === 'table' ? `DROP TABLE IF EXISTS ${quoteIdent(name)};` :
      null;
    if (!stmt) continue;
    await targetDb.sql(stmt);
  }
}

async function migrate() {
  const args = parseArgs(process.argv);
  const sourceUrl = args.source || process.env.DATABASE_URL;
  const targetUrl = args.target;

  if (!sourceUrl || !String(sourceUrl).startsWith('sqlitecloud://')) {
    throw new Error(`Missing/invalid --source (or DATABASE_URL). Expected sqlitecloud://...`);
  }
  if (!targetUrl || !String(targetUrl).startsWith('sqlitecloud://')) {
    throw new Error(`Missing/invalid --target. Expected sqlitecloud://...`);
  }

  console.log(`\n🌩️  SQLiteCloud → SQLiteCloud Migration\n`);
  console.log(`Source: ${sourceUrl.replace(/apikey=[^&]+/i, 'apikey=***')}`);
  console.log(`Target: ${targetUrl.replace(/apikey=[^&]+/i, 'apikey=***')}`);
  console.log(`Mode:   ${args.drop ? 'DROP + recreate' : 'safe (abort if target not empty)'}\n`);

  const sourceDb = new Database(sourceUrl);
  const targetDb = new Database(targetUrl);

  try {
    // Speed / avoid FK issues during load
    await targetDb.sql`PRAGMA foreign_keys = OFF`;

    const targetTables = await getUserTables(targetDb);
    if (targetTables.length > 0 && !args.drop) {
      throw new Error(
        `Target DB already has ${targetTables.length} table(s): ${targetTables.join(', ')}. ` +
        `Re-run with --drop to wipe target before migration.`
      );
    }

    if (args.drop) {
      console.log(`🧹 Dropping existing target objects...`);
      await dropTargetObjects(targetDb);
      console.log(`✅ Target cleared\n`);
    }

    console.log(`📋 Reading schema from source...`);
    const schemaObjects = await getSchemaObjects(sourceDb);
    const tables = schemaObjects.filter(o => o.type === 'table');
    const nonTables = schemaObjects.filter(o => o.type !== 'table');
    console.log(`✅ Found ${tables.length} tables, ${nonTables.length} other objects\n`);

    console.log(`🏗️  Creating tables on target...`);
    for (const t of tables) {
      if (!t.sql) continue;
      await targetDb.sql(`${t.sql};`);
      console.log(`  ✅ ${t.name}`);
    }
    console.log('');

    console.log(`📥 Copying table data...`);
    for (const t of tables) {
      const tableName = t.name;
      const columns = await getTableColumns(sourceDb, tableName);
      if (columns.length === 0) {
        console.log(`  ⏭️  ${tableName} (no columns)`); // unusual
        continue;
      }

      const total = await countRows(sourceDb, tableName);
      if (total === 0) {
        console.log(`  ⏭️  ${tableName} (0 rows)`);
        continue;
      }

      const colIdents = columns.map(quoteIdent).join(', ');
      const rowPlaceholder = `(${columns.map(() => '?').join(', ')})`;
      const batchSize = Number(args.batch || 200);
      let offset = 0;

      console.log(`  📊 ${tableName}: ${total} rows`);
      while (offset < total) {
        const rows = await sourceDb.sql(
          `SELECT * FROM ${quoteIdent(tableName)} LIMIT ${batchSize} OFFSET ${offset}`
        );
        const batchRows = Array.isArray(rows) ? rows : [];
        if (batchRows.length === 0) break;

        const valuesFlat = [];
        for (const r of batchRows) {
          for (const c of columns) {
            valuesFlat.push(normalizeValue(r[c]));
          }
        }

        const valuesSql = new Array(batchRows.length).fill(rowPlaceholder).join(', ');
        const insertSql = `INSERT INTO ${quoteIdent(tableName)} (${colIdents}) VALUES ${valuesSql}`;
        await targetDb.sql(insertSql, ...valuesFlat);

        offset += batchRows.length;
      }
    }
    console.log('');

    console.log(`🧩 Creating indexes/views/triggers...`);
    for (const o of nonTables) {
      // Some sqlite_master entries have NULL sql (e.g. auto-indexes)
      if (!o.sql) continue;
      try {
        await targetDb.sql(`${o.sql};`);
        console.log(`  ✅ ${o.type}: ${o.name}`);
      } catch (e) {
        console.warn(`  ⚠️  ${o.type}: ${o.name} failed: ${e.message}`);
      }
    }
    console.log('');

    await targetDb.sql`PRAGMA foreign_keys = ON`;

    // Verify counts
    console.log(`🔎 Verifying row counts...`);
    const mismatches = [];
    for (const t of tables) {
      const tableName = t.name;
      const a = await countRows(sourceDb, tableName);
      const b = await countRows(targetDb, tableName);
      if (a !== b) mismatches.push({ tableName, source: a, target: b });
    }

    if (mismatches.length) {
      console.warn(`⚠️  Count mismatches detected:`);
      mismatches.forEach(m => console.warn(`  - ${m.tableName}: source=${m.source} target=${m.target}`));
    } else {
      console.log(`✅ All table counts match`);
    }

    console.log(`\n✅ Migration complete.\n`);
    console.log(`Next step: update your runtime DATABASE_URL to the *target* SQLiteCloud URL.`);
    console.log(`(Do NOT commit secrets like apikey into git.)\n`);
  } finally {
    try { sourceDb.close(); } catch {}
    try { targetDb.close(); } catch {}
  }
}

migrate().catch((err) => {
  console.error(`\n❌ Migration failed: ${err.message}`);
  process.exitCode = 1;
});

