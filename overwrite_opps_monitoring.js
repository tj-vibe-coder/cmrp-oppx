const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

const connectionString = process.env.DATABASE_URL || 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

async function overwriteOppsMonitoring() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database overwrite process...');
    
    // Truncate the existing table with CASCADE to handle foreign key constraints
    await client.query('TRUNCATE TABLE opps_monitoring CASCADE');
    console.log('Existing data cleared from opps_monitoring table');
    
    // Read and insert CSV data
    const rows = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('./formatted_opps_monitoring.csv')
        .pipe(csv())
        .on('data', (row) => {
          rows.push(row);
        })
        .on('end', () => {
          console.log(`Processing ${rows.length} rows...`);
          resolve();
        })
        .on('error', reject);
    });
    
    // Insert all rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Filter out empty keys and their corresponding values
      const filteredEntries = Object.entries(row).filter(([key, value]) => key.trim() !== '');
      const keys = filteredEntries.map(([key]) => key);
      const values = filteredEntries.map(([, value]) => value);
      
      if (keys.length === 0) {
        console.log(`Skipping row ${i + 1} - no valid columns`);
        continue;
      }
      
      // Create placeholders for the query
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const columnNames = keys.map(key => `"${key}"`).join(', ');
      
      const insertQuery = `INSERT INTO opps_monitoring (${columnNames}) VALUES (${placeholders})`;
      
      try {
        await client.query(insertQuery, values);
        if ((i + 1) % 100 === 0) {
          console.log(`Inserted ${i + 1} rows...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i + 1}:`, error);
        console.error('Row data:', row);
      }
    }
    
    console.log(`Successfully inserted ${rows.length} rows into opps_monitoring table`);
    
  } catch (error) {
    console.error('Error overwriting opps_monitoring table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

overwriteOppsMonitoring()
  .then(() => {
    console.log('Database overwrite completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database overwrite failed:', error);
    process.exit(1);
  });