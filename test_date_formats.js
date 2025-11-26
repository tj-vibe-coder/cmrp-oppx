// Comprehensive test for date formatting issues
function formatDate(val) {
  if (!val || typeof val.toString !== 'function') return '';
  const dateStr = val.toString().trim();
  if (!dateStr) return '';
  
  // Remove common invalid date values
  const invalidValues = ['TBI', 'TBD', 'N/A', 'NA', 'NULL', 'PENDING', 'UNKNOWN', '-', '--'];
  const upperDateStr = dateStr.toUpperCase();
  if (invalidValues.includes(upperDateStr)) {
    return '';
  }
  
  // Handle special formats with month names (e.g., "Fri,Mar 21", "Mar 21, 2025", "21 Mar 2025")
  // First try to parse using JavaScript Date constructor which handles many text formats
  let jsDate = new Date(dateStr);
  if (!isNaN(jsDate.getTime())) {
    // Successfully parsed by Date constructor
    let year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1;
    const day = jsDate.getDate();
    
    // If year seems unreasonable (too old), use default year 2025
    const defaultYear = 2025;
    if (year < 2020 || year > 2030) {
      // Check if original string contains explicit year
      const hasExplicitYear = /\b(19|20)\d{2}\b/.test(dateStr);
      if (!hasExplicitYear) {
        year = defaultYear;
      }
    }
    
    // Validate the parsed date with potentially corrected year
    const validationDate = new Date(year, month - 1, day);
    if (validationDate.getFullYear() === year && 
        validationDate.getMonth() === (month - 1) && 
        validationDate.getDate() === day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  // If JavaScript Date failed, try manual parsing with numeric-only approach
  // Remove any non-date characters but preserve common separators
  const cleanedDateStr = dateStr.replace(/[^0-9\/\-.\s]/gi, '').trim();
  if (!cleanedDateStr) return '';

  const defaultYear = 2025;

  let d = new Date(cleanedDateStr);

  if (!isNaN(d.getTime())) { // Successfully parsed by Date constructor
    let year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // Check if original string contained an explicit year
    const has4DigitYear = /\b\d{4}\b/.test(cleanedDateStr);
    const has2DigitYear = /(?:\d{1,2}[\/\-.]){2}(\d{2})\b/.test(cleanedDateStr);

    if (!has4DigitYear && !has2DigitYear) {
      year = defaultYear;
    } else if (has2DigitYear && !has4DigitYear) {
      const parts = cleanedDateStr.split(/[\/\-.]/);
      if (parts.length === 3 && parts[2].length === 2) {
        let yPart = parseInt(parts[2]);
        if (!isNaN(yPart) && yPart >= 0 && yPart <= 99) {
          year = 2000 + yPart;
        }
      }
    }
    
    const finalCheck = new Date(year, month - 1, day);
    if (finalCheck.getFullYear() === year && finalCheck.getMonth() === (month - 1) && finalCheck.getDate() === day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  
  return '';
}

// Test various problematic date formats
const problematicDates = [
  'Fri,Mar 21',
  'Fri, Mar 21',
  'Friday, March 21',
  'Mar 21',
  'March 21',
  '21 Mar',
  '21 March',
  'Mar 21, 2025',
  'March 21, 2025',
  '21 Mar 2025',
  '21 March 2025',
  'Friday, Mar 21, 2025',
  'Fri, 21 Mar 2025',
  '3/21',
  '3/21/25',
  '3/21/2025',
  '03/21/25',
  '03/21/2025',
  '21/3',
  '21/3/25',
  '21/3/2025',
  '21/03/25',
  '21/03/2025',
  '2025-03-21',
  '2025/03/21',
  'Mar-21',
  'Mar-21-2025',
  '21-Mar',
  '21-Mar-2025',
  'TBI',
  'TBD',
  'N/A',
  '',
  null,
  undefined
];

console.log('=== COMPREHENSIVE DATE FORMAT TEST ===');
problematicDates.forEach(date => {
  try {
    const result = formatDate(date);
    const status = result ? '✅' : '❌';
    console.log(`${status} "${date}" -> "${result}"`);
  } catch (error) {
    console.log(`💥 "${date}" -> ERROR: ${error.message}`);
  }
});

console.log('\n=== POSTGRESQL DATE VALIDITY TEST ===');
// Test if the formatted dates would be valid in PostgreSQL
const testResults = problematicDates.map(date => {
  const formatted = formatDate(date);
  if (formatted) {
    // Test if it's a valid PostgreSQL date format (YYYY-MM-DD)
    const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(formatted);
    return { original: date, formatted, isValidFormat };
  }
  return { original: date, formatted: '', isValidFormat: true }; // empty is valid (NULL)
});

testResults.forEach(({ original, formatted, isValidFormat }) => {
  if (formatted) {
    const status = isValidFormat ? '✅' : '❌';
    console.log(`${status} "${original}" -> "${formatted}" (${isValidFormat ? 'Valid PostgreSQL' : 'Invalid PostgreSQL'})`);
  }
});

console.log('\n=== SUMMARY ===');
const successCount = testResults.filter(r => r.formatted && r.isValidFormat).length;
const totalNonEmpty = testResults.filter(r => r.original && r.original !== 'TBI' && r.original !== 'TBD' && r.original !== 'N/A').length;
console.log(`Successfully formatted: ${successCount}/${totalNonEmpty} date formats`); 