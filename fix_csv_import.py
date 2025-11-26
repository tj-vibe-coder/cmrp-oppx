#!/usr/bin/env python3
import csv
import re

def fix_csv_for_import():
    input_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_fixed.csv'
    output_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_final.csv'
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        for row in reader:
            if len(row) >= 32:  # Ensure we have enough columns
                # Check google_drive_folder_id (column index 31)
                if len(row) > 31 and row[31] and len(row[31].strip()) <= 10:
                    # Clear short google_drive_folder_id values to avoid constraint violation
                    row[31] = ''
                
                # Only include the first 32 columns that match the database schema
                row_to_write = row[:32]
                writer.writerow(row_to_write)
    
    print(f"Fixed CSV saved to: {output_file}")

if __name__ == "__main__":
    fix_csv_for_import()