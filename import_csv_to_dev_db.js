require('dotenv').config();
const fs = require('fs');
const csv = require('fast-csv');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://reuelrivera@localhost:5432/cmrp_opps_db?sslmode=disable',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function importCSV() {
  const csvFilePath = './formatted_opps_monitoring.csv';
  const opportunities = [];

  console.log('🔄 Starting CSV import process...');
  console.log(`📁 Reading from: ${csvFilePath}`);

  // Read CSV file
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv.parse({ headers: false }))
      .on('data', (row) => {
        // Helper function to parse and validate dates
        const parseDate = (dateStr) => {
          if (!dateStr || dateStr.trim() === '') return null;
          
          // Handle various date formats
          let cleanDate = dateStr.trim();
          
          // Skip invalid formats like "Thu, 30/7/25"
          if (cleanDate.includes(',') || cleanDate.includes('Thu') || cleanDate.includes('Mon') || 
              cleanDate.includes('Tue') || cleanDate.includes('Wed') || cleanDate.includes('Fri') ||
              cleanDate.includes('Sat') || cleanDate.includes('Sun')) {
            return null;
          }
          
          // Try to parse the date
          const parsed = new Date(cleanDate);
          if (isNaN(parsed.getTime())) return null;
          
          // Return in YYYY-MM-DD format
          return parsed.toISOString().split('T')[0];
        };

        // Map CSV columns to database columns
        const opportunity = {
          encoded_date: parseDate(row[0]),
          project_name: row[1] || null,
          project_code: row[2] || null,
          rev: row[3] && !isNaN(parseInt(row[3])) ? parseInt(row[3]) : null,
          client: row[4] || null,
          solutions: row[5] || null,
          sol_particulars: row[6] || null,
          industries: row[7] || null,
          ind_particulars: row[8] || null,
          date_received: parseDate(row[9]),
          client_deadline: parseDate(row[10]),
          decision: row[11] || null,
          account_mgr: row[12] || null,
          pic: row[13] || null,
          bom: row[14] || null,
          status: row[15] || null,
          submitted_date: parseDate(row[16]),
          margin: row[17] && !isNaN(parseFloat(row[17])) ? parseFloat(row[17]) : null,
          final_amt: row[18] && !isNaN(parseFloat(row[18])) ? parseFloat(row[18]) : null,
          opp_status: row[19] || null,
          date_awarded_lost: parseDate(row[20]),
          lost_rca: row[21] || null,
          l_particulars: row[22] || null,
          a: row[23] || null,
          c: row[24] || null,
          r: row[25] || null,
          u: row[26] || null,
          d: row[27] || null,
          remarks_comments: row[28] || null,
          uid: row[29] || null, // Will be generated if null
          forecast_date: parseDate(row[30])
        };
        opportunities.push(opportunity);
      })
      .on('end', async () => {
        try {
          console.log(`📊 Parsed ${opportunities.length} opportunities from CSV`);
          
          // Start transaction
          const client = await pool.connect();
          await client.query('BEGIN');
          
          console.log('🗑️  Clearing existing data...');
          await client.query('DELETE FROM opps_monitoring');
          
          console.log('📥 Inserting new data...');
          let insertedCount = 0;
          
          for (const opp of opportunities) {
            const query = `
              INSERT INTO opps_monitoring (
                encoded_date, project_name, project_code, rev, client, solutions, sol_particulars,
                industries, ind_particulars, date_received, client_deadline, decision, account_mgr,
                pic, bom, status, submitted_date, margin, final_amt, opp_status, date_awarded_lost,
                lost_rca, l_particulars, a, c, r, u, d, remarks_comments, uid, forecast_date
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
              )
            `;
            
            const values = [
              opp.encoded_date,
              opp.project_name,
              opp.project_code,
              opp.rev,
              opp.client,
              opp.solutions,
              opp.sol_particulars,
              opp.industries,
              opp.ind_particulars,
              opp.date_received,
              opp.client_deadline,
              opp.decision,
              opp.account_mgr,
              opp.pic,
              opp.bom,
              opp.status,
              opp.submitted_date,
              opp.margin,
              opp.final_amt,
              opp.opp_status,
              opp.date_awarded_lost,
              opp.lost_rca,
              opp.l_particulars,
              opp.a,
              opp.c,
              opp.r,
              opp.u,
              opp.d,
              opp.remarks_comments,
              opp.uid === '' ? null : opp.uid, // Let DB generate UUID if empty
              opp.forecast_date
            ];
            
            try {
              await client.query(query, values);
              insertedCount++;
            } catch (err) {
              console.error(`Error inserting row ${insertedCount + 1}:`, err.message);
              console.error('Row data:', opp);
              // Continue with other rows
            }
          }
          
          // Commit transaction
          await client.query('COMMIT');
          client.release();
          
          console.log(`✅ Successfully imported ${insertedCount} opportunities`);
          console.log('🔍 Verifying import...');
          
          // Verify import
          const countResult = await pool.query('SELECT COUNT(*) FROM opps_monitoring');
          console.log(`📈 Total records in database: ${countResult.rows[0].count}`);
          
          resolve(insertedCount);
        } catch (error) {
          console.error('❌ Error during import:', error.message);
          await client.query('ROLLBACK');
          client.release();
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('❌ Error reading CSV:', error.message);
        reject(error);
      });
  });
}

// Run the import
importCSV()
  .then((count) => {
    console.log(`🎉 Import completed successfully! ${count} records imported.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import failed:', error.message);
    process.exit(1);
  });