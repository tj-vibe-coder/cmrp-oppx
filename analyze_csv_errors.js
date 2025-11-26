// Script to analyze CSV file and identify problematic records
const fs = require('fs');
const csv = require('fast-csv');

async function analyzeCSVErrors() {
    console.log('🔍 Analyzing CSV file for problematic records...\n');
    
    const csvData = [];
    let rowNumber = 0;
    
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
                
                // Check for issues
                const issues = [];
                
                // Check if row has correct number of columns (should be 31)
                if (cleanedRow.length !== 31) {
                    issues.push(`Column count mismatch: ${cleanedRow.length} columns (expected 31)`);
                }
                
                // Check for required fields (uid is required)
                if (!cleanedRow[29] || cleanedRow[29] === null) {
                    issues.push('Missing UID (required field)');
                }
                
                // Check for extra trailing columns (some rows have extra "1" at the end)
                if (cleanedRow.length > 31) {
                    issues.push(`Extra columns detected: ${cleanedRow.length - 31} extra columns`);
                }
                
                // Check for completely empty rows
                const nonEmptyCells = cleanedRow.filter(cell => cell !== null && cell !== '');
                if (nonEmptyCells.length === 0) {
                    issues.push('Completely empty row');
                }
                
                if (issues.length > 0) {
                    csvData.push({
                        rowNumber,
                        issues,
                        data: cleanedRow
                    });
                }
            })
            .on('end', () => {
                console.log(`📊 Analysis complete! Found ${csvData.length} problematic records:\n`);
                
                csvData.forEach((record, index) => {
                    console.log(`\n${index + 1}. Row ${record.rowNumber}:`);
                    console.log(`   Issues: ${record.issues.join(', ')}`);
                    console.log(`   Project Name: ${record.data[1] || 'N/A'}`);
                    console.log(`   Client: ${record.data[4] || 'N/A'}`);
                    console.log(`   UID: ${record.data[29] || 'MISSING'}`);
                    console.log(`   Column Count: ${record.data.length}`);
                    
                    // Show the actual data for debugging
                    if (record.data.length > 31) {
                        console.log(`   Extra columns: ${record.data.slice(31).join(', ')}`);
                    }
                });
                
                console.log(`\n📋 Summary:`);
                console.log(`   Total problematic records: ${csvData.length}`);
                console.log(`   Records with missing UID: ${csvData.filter(r => r.issues.includes('Missing UID')).length}`);
                console.log(`   Records with column count mismatch: ${csvData.filter(r => r.issues.includes('Column count mismatch')).length}`);
                console.log(`   Records with extra columns: ${csvData.filter(r => r.issues.includes('Extra columns detected')).length}`);
                
                resolve();
            });
    });
}

// Run the analysis
analyzeCSVErrors()
    .then(() => {
        console.log('\n✅ Analysis completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Analysis failed:', error);
        process.exit(1);
    }); 