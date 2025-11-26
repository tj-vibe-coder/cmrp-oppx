const { Pool } = require('pg');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function checkConstraints() {
  const client = await pool.connect();
  
  try {
    // Check unique constraints and indexes
    const result = await client.query(`
      SELECT 
        t.constraint_name, 
        t.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints t
      LEFT JOIN information_schema.key_column_usage kcu 
        ON t.constraint_name = kcu.constraint_name 
        AND t.table_name = kcu.table_name
      WHERE t.table_name = 'dashboard_snapshots'
      AND t.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY t.constraint_name, kcu.ordinal_position
    `);
    
    console.log('Unique constraints and primary keys:');
    if (result.rows.length === 0) {
      console.log('No unique constraints found');
    } else {
      result.rows.forEach(row => {
        console.log(`${row.constraint_name} (${row.constraint_type}): ${row.column_name}`);
      });
    }
    
    // Also check indexes
    const indexResult = await client.query(`
      SELECT 
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t,
           pg_class i,
           pg_index ix,
           pg_attribute a
      WHERE t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname = 'dashboard_snapshots'
      ORDER BY i.relname, a.attname
    `);
    
    console.log('\nIndexes:');
    if (indexResult.rows.length === 0) {
      console.log('No indexes found');
    } else {
      indexResult.rows.forEach(row => {
        console.log(`${row.index_name}: ${row.column_name} (unique: ${row.is_unique})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking constraints:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkConstraints();
