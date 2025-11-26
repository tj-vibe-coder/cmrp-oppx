require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const csvFilePath = './formatted_opps_monitoring.csv';

async function importCSVToProduction() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting manual CSV import to production table...');
    
    // First, clear the existing opps_monitoring table
    console.log('🗑️  Clearing existing opps_monitoring table...');
    await client.query('DELETE FROM opps_monitoring');
    console.log('✅ Table cleared successfully');
    
    // Prepare insert statement based on actual database schema
    const insertQuery = `
      INSERT INTO opps_monitoring (
        encoded_date, project_name, project_code, rev, client, 
        solutions, sol_particulars, industries, ind_particulars, 
        date_received, client_deadline, decision, pic, bom, 
        account_mgr, status, submitted_date, margin, final_amt, 
        opp_status, date_awarded_lost, lost_rca, l_particulars, 
        a, c, r, u, d, remarks_comments, 
        uid, forecast_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      )
    `;
    
    let rowCount = 0;
    const importPromises = [];
    
    // Read and process CSV file
    const csvStream = fs.createReadStream(csvFilePath)
      .pipe(csv({
        headers: false, // Use array indices since CSV doesn't have headers
        skipEmptyLines: true
      }));
    
    for await (const row of csvStream) {
      const values = Object.values(row);
      
      // Skip empty rows
      if (values.length < 31) {
        console.log(`⚠️  Skipping row ${rowCount + 1}: insufficient columns (${values.length})`);
        continue;
      }
      
      try {
        // Convert empty strings to null for proper database handling
        const processedValues = values.map(val => val === '' ? null : val);
        
        await client.query(insertQuery, processedValues);
        rowCount++;
        
        if (rowCount % 100 === 0) {
          console.log(`📊 Processed ${rowCount} rows...`);
        }
      } catch (rowError) {
        console.error(`❌ Error inserting row ${rowCount + 1}:`, rowError.message);
        console.error('Row data:', values);
      }
    }
    
    console.log(`🎉 Import completed successfully! Imported ${rowCount} rows.`);
    
    // Verify the import
    const countResult = await client.query('SELECT COUNT(*) FROM opps_monitoring');
    console.log(`📊 Total rows in opps_monitoring table: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute the import
importCSVToProduction()
  .then(() => {
    console.log('✅ Manual CSV import process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error);
    process.exit(1);
  });