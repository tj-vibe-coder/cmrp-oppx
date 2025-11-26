#!/usr/bin/env python3
import csv
import re
from datetime import datetime

def generate_project_code(date_str):
    """Generate a CMRP project code based on the date"""
    try:
        # Parse the date
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        # Format as CMRPYYMMDDNN where NN is a sequence number
        year = date_obj.strftime('%y')
        month = date_obj.strftime('%m')
        day = date_obj.strftime('%d')
        # Use a simple incrementing number for uniqueness
        seq = str(hash(date_str) % 1000).zfill(3)
        return f"CMRP{year}{month}{seq}"
    except:
        # Fallback if date parsing fails
        return f"CMRP25000001"

def fix_csv_file():
    input_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring.csv'
    output_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_fixed.csv'
    
    fixed_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        for row_num, row in enumerate(reader, 1):
            if len(row) >= 3:  # Ensure we have at least 3 columns
                date_str = row[0]
                project_name = row[1]
                project_code = row[2]
                
                # Check if project code is just "CMRP" (incomplete)
                if project_code.strip() == "CMRP":
                    # Generate a new project code
                    new_code = generate_project_code(date_str)
                    row[2] = new_code
                    fixed_count += 1
                    print(f"Fixed row {row_num}: '{project_name}' -> {new_code}")
            
            writer.writerow(row)
    
    print(f"\nFixed {fixed_count} incomplete project codes")
    print(f"Output saved to: {output_file}")

if __name__ == "__main__":
    fix_csv_file()