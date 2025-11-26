const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');

// Production database connection
const pool = new Pool({
  connectionString: 'postgresql://opps_management_owner:npg_Br9RoWqlTPZ0@ep-quiet-dawn-a1jwkxgx-pooler.ap-southeast-1.aws.neon.tech/opps_management?sslmode=require'
});

function cleanDateValue(dateStr) {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '""' || dateStr.trim() === "''" || dateStr === '""' || dateStr.toString().trim() === '') return null;
  
  const cleaned = dateStr.toString().trim().replace(/^["']|["']$/g, '');
  if (!cleaned || cleaned === '') return null;
  
  if (cleaned.includes(',')) {
    const datePart = cleaned.split(',')[1].trim();
    const parts = datePart.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      let year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
  }
  
  if (cleaned.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return cleaned;
  }
  
  return null;
}

function cleanNumericValue(numStr) {
  if (!numStr || numStr.trim() === '') return null;
  const cleaned = numStr.replace(/[^\d.-]/g, '');
  return cleaned === '' ? null : parseFloat(cleaned);
}

function cleanStringValue(str) {
  if (!str || str.toString().trim() === '' || str.toString().trim() === '""' || str.toString().trim() === "''") return null;
  return str.toString().trim();
}

async function overwriteTable() {
  try {
    console.log('Starting table overwrite process...');
    
    // First, truncate the existing table
    console.log('Truncating existing opps_monitoring table...');
    await pool.query('TRUNCATE TABLE opps_monitoring RESTART IDENTITY CASCADE');
    console.log('Table truncated successfully.');
    
    const results = [];
    
    fs.createReadStream('formatted_opps_monitoring.csv')
      .pipe(csv({ headers: false }))
      .on('data', (data) => {
        const row = Object.values(data);
        if (row.length >= 31) {
          const cleanedRow = [
            cleanDateValue(row[0]), // date_created
            cleanStringValue(row[1]), // project_name
            cleanStringValue(row[2]), // opp_id
            cleanNumericValue(row[3]), // dept
            cleanStringValue(row[4]), // company
            cleanStringValue(row[5]), // category
            cleanStringValue(row[6]), // subcategory
            cleanStringValue(row[7]), // industry
            cleanStringValue(row[8]), // sub_industry
            cleanDateValue(row[9]), // date_endorsed
            cleanDateValue(row[10]), // client_deadline
            cleanStringValue(row[11]), // status
            cleanStringValue(row[12]), // pic
            cleanStringValue(row[13]), // bom
            cleanStringValue(row[14]), // source
            cleanStringValue(row[15]), // proposal_status
            cleanDateValue(row[16]), // date_submitted
            cleanNumericValue(row[17]), // lead_time
            cleanNumericValue(row[18]), // amount
            cleanStringValue(row[19]), // output_stage
            cleanDateValue(row[20]), // won_date
            cleanStringValue(row[21]), // lost_reason
            cleanStringValue(row[22]), // probability
            cleanStringValue(row[23]), // demand_gen
            cleanStringValue(row[24]), // solution_fit
            cleanStringValue(row[25]), // business_case
            cleanStringValue(row[26]), // timing
            cleanStringValue(row[27]), // authority
            cleanStringValue(row[28]), // notes
            cleanStringValue(row[29]), // id (UUID)
            cleanDateValue(row[30]), // created_at (forecast_date)
            cleanNumericValue(row[31]) || 1 // version
          ];
          
          results.push(cleanedRow);
        }
      })
      .on('end', async () => {
        console.log(`Processing ${results.length} rows...`);
        
        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          try {
            await pool.query(`
              INSERT INTO opps_monitoring (
                encoded_date, project_name, project_code, rev, client, solutions, sol_particulars,
                industries, ind_particulars, date_received, client_deadline, decision, account_mgr, pic,
                bom, status, submitted_date, margin, final_amt, opp_status,
                date_awarded_lost, lost_rca, l_particulars, a, c, r,
                u, d, remarks_comments, uid, forecast_date, revision
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
                       $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, 
                       $30, $31, $32)
            `, row);
            
            if ((i + 1) % 50 === 0) {
              console.log(`Inserted ${i + 1} rows...`);
            }
          } catch (err) {
            console.error(`Error inserting row ${i + 1}:`, err.message);
            console.error('Row data:', row);
          }
        }
        
        console.log('Table overwrite completed successfully!');
        console.log(`Total rows inserted: ${results.length}`);
        await pool.end();
      });
  } catch (error) {
    console.error('Error:', error);
    await pool.end();
  }
}

overwriteTable();