const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

const connectionString = 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
});

// Column mapping from CSV headers to database columns
const columnMapping = {
  '2024-07-24': 'encoded_date',
  "URC ESMO Piatto's Mixer PLC Controls (PR# 1200008744)": 'project_name',
  'CMRP24070287': 'project_code',
  '2': 'rev',
  'URC BCFG': 'client',
  'Automation': 'solutions',
  'PLC / SCADA': 'sol_particulars',
  'Manufacturing': 'industries',
  'F&B': 'ind_particulars',
  '2025-03-18': 'date_received',
  '2025-03-21': 'client_deadline',
  'GO': 'decision',
  'JMO': 'account_mgr',
  'RJR': 'pic',
  'Submitted': 'status',
  '2025-03-24': 'submitted_date',
  '17': 'margin',
  '1963392.85': 'final_amt',
  'OP100': 'opp_status',
  '2025-04-01': 'date_awarded_lost',
  '': 'lost_rca', // Empty column for lost_rca
  '10-Existing': 'a',
  '10 -Existing Solution': 'c',
  '10 -Focus Business': 'r',
  '10 -Reasonable Time': 'u',
  '10 -Complete': 'd',
  'PO# 400142053 10-Apr-2025': 'remarks_comments',
  '0ec5e87d-7e3e-4c9d-9afe-2cc90447e884': 'uid',
  '1': 'revision'
};

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
      const csvRow = rows[i];
      const dbRow = {};
      
      // Map CSV columns to database columns
      for (const [csvHeader, value] of Object.entries(csvRow)) {
        const dbColumn = columnMapping[csvHeader];
        if (dbColumn) {
          // Handle special cases
          if (dbColumn === 'uid' && (!value || value.trim() === '')) {
            dbRow[dbColumn] = uuidv4(); // Generate new UUID if empty
          } else if (['rev', 'margin'].includes(dbColumn) && (!value || value.trim() === '')) {
            dbRow[dbColumn] = null; // Set numeric fields to null if empty
          } else if (['final_amt'].includes(dbColumn) && (!value || value.trim() === '')) {
            dbRow[dbColumn] = null; // Set numeric fields to null if empty
          } else if (['encoded_date', 'date_received', 'client_deadline', 'submitted_date', 'date_awarded_lost'].includes(dbColumn)) {
            // Handle date fields - set to null if empty
            dbRow[dbColumn] = (value && value.trim() !== '') ? value : null;
          } else {
            dbRow[dbColumn] = value || null;
          }
        }
      }
      
      // Ensure uid is always present
      if (!dbRow.uid) {
        dbRow.uid = uuidv4();
      }
      
      // Create the insert query
      const columns = Object.keys(dbRow);
      const values = Object.values(dbRow);
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const columnNames = columns.map(col => `"${col}"`).join(', ');
      
      const insertQuery = `INSERT INTO opps_monitoring (${columnNames}) VALUES (${placeholders})`;
      
      try {
        await client.query(insertQuery, values);
        if ((i + 1) % 100 === 0) {
          console.log(`Inserted ${i + 1} rows...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i + 1}:`, error);
        console.error('Mapped row data:', dbRow);
        console.error('Original CSV row:', csvRow);
      }
    }
    
    console.log(`Successfully processed ${rows.length} rows for opps_monitoring table`);
    
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