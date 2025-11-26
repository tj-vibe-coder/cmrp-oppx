#!/usr/bin/env python3
import csv
import re
from datetime import datetime

def fix_date_format(date_str):
    """Fix various date formats to YYYY-MM-DD"""
    if not date_str or date_str.strip() == '':
        return ''
    
    date_str = date_str.strip()
    
    # Handle "Thu, 30/7/25" format
    if re.match(r'^[A-Za-z]{3},?\s+\d{1,2}/\d{1,2}/\d{2,4}', date_str):
        # Extract the date part after the day name
        match = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', date_str)
        if match:
            day, month, year = match.groups()
            # Convert 2-digit year to 4-digit
            if len(year) == 2:
                year = '20' + year
            try:
                date_obj = datetime(int(year), int(month), int(day))
                return date_obj.strftime('%Y-%m-%d')
            except:
                return ''
    
    # Handle existing YYYY-MM-DD format
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        return date_str
    
    # Handle MM/DD/YYYY format
    if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', date_str):
        try:
            date_obj = datetime.strptime(date_str, '%m/%d/%Y')
            return date_obj.strftime('%Y-%m-%d')
        except:
            return ''
    
    # Handle DD/MM/YYYY format
    if re.match(r'^\d{1,2}/\d{1,2}/\d{4}$', date_str):
        parts = date_str.split('/')
        if len(parts) == 3:
            try:
                # Try both MM/DD and DD/MM
                date_obj = datetime(int(parts[2]), int(parts[0]), int(parts[1]))
                return date_obj.strftime('%Y-%m-%d')
            except:
                try:
                    date_obj = datetime(int(parts[2]), int(parts[1]), int(parts[0]))
                    return date_obj.strftime('%Y-%m-%d')
                except:
                    return ''
    
    return ''

def fix_csv_dates():
    input_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_final.csv'
    output_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_clean.csv'
    
    date_columns = [0, 9, 10, 16, 20, 30]  # encoded_date, date_received, client_deadline, submitted_date, date_awarded_lost, forecast_date
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        for row_num, row in enumerate(reader, 1):
            # Fix date columns
            for col_idx in date_columns:
                if col_idx < len(row):
                    fixed_date = fix_date_format(row[col_idx])
                    row[col_idx] = fixed_date
            
            writer.writerow(row)
    
    print(f"Fixed dates in CSV saved to: {output_file}")

if __name__ == "__main__":
    fix_csv_dates()