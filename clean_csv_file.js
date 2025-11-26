// Script to clean CSV file by removing extra trailing columns
const fs = require('fs');
const csv = require('fast-csv');

async function cleanCSVFile() {
    console.log('🧹 Cleaning CSV file...\n');
    
    const cleanedRows = [];
    let rowNumber = 0;
    let fixedCount = 0;
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('formatted_opps_monitoring.csv')
            .pipe(csv.parse({ headers: false, ignoreEmpty: true, trim: true }))
            .on('error', error => {
                console.error('❌ CSV parse error:', error);
                reject(error);
            })
            .on('data', row => {
                rowNumber++;
                const cleanedRow = row.map(cell => {
                    if (cell === '' || cell === 'NULL' || cell === 'null') {
                        return null;
                    }
                    return cell;
                });
                
                // Check if row has extra columns (more than 31)
                if (cleanedRow.length > 31) {
                    console.log(`🔧 Row ${rowNumber}: Removing ${cleanedRow.length - 31} extra column(s)`);
                    console.log(`   Project: ${cleanedRow[1] || 'N/A'}`);
                    console.log(`   Extra columns: ${cleanedRow.slice(31).join(', ')}`);
                    
                    // Keep only the first 31 columns
                    const fixedRow = cleanedRow.slice(0, 31);
                    cleanedRows.push(fixedRow);
                    fixedCount++;
                } else {
                    // Row is already correct, keep as-is
                    cleanedRows.push(cleanedRow);
                }
            })
            .on('end', () => {
                console.log(`\n📊 Cleaning complete!`);
                console.log(`   Total rows processed: ${rowNumber}`);
                console.log(`   Rows fixed: ${fixedCount}`);
                console.log(`   Rows already correct: ${rowNumber - fixedCount}`);
                
                // Write the cleaned data back to a new file
                const outputStream = fs.createWriteStream('formatted_opps_monitoring_cleaned.csv');
                const csvWriter = csv.format({ headers: false });
                
                csvWriter.pipe(outputStream);
                
                cleanedRows.forEach(row => {
                    csvWriter.write(row);
                });
                
                csvWriter.end();
                
                console.log(`\n✅ Cleaned CSV saved as: formatted_opps_monitoring_cleaned.csv`);
                console.log(`   All rows now have exactly 31 columns`);
                
                resolve();
            });
    });
}

// Run the cleaning
cleanCSVFile()
    .then(() => {
        console.log('\n🎉 CSV cleaning completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Cleaning failed:', error);
        process.exit(1);
    }); 