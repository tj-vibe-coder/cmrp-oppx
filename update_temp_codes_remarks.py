#!/usr/bin/env python3
import csv

def update_temp_code_remarks():
    """Add remarks to records with temporary project codes"""
    
    input_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring.csv'
    output_file = '/Users/reuelrivera/Documents/CMRP Opps Management/CMRP-Opps-Management/formatted_opps_monitoring_updated.csv'
    
    # List of generated temporary codes from our fix
    temp_codes = [
        'CMRP2501385', 'CMRP2501211', 'CMRP2504760', 'CMRP2502753', 'CMRP2502357',
        'CMRP2502983', 'CMRP2502936', 'CMRP2502005', 'CMRP2502932', 'CMRP2503754',
        'CMRP2503972', 'CMRP2503742', 'CMRP2503022', 'CMRP2503328', 'CMRP2503297',
        'CMRP2504175', 'CMRP2504363', 'CMRP2504054', 'CMRP2504898', 'CMRP2504468',
        'CMRP2504834', 'CMRP2505008', 'CMRP2505120', 'CMRP2505226', 'CMRP2505788',
        'CMRP2504033', 'CMRP2503338', 'CMRP2505947', 'CMRP2505272', 'CMRP2505516',
        'CMRP2505224', 'CMRP2505777', 'CMRP2505338', 'CMRP2505402', 'CMRP2505279',
        'CMRP2505353', 'CMRP2506392', 'CMRP2506552', 'CMRP2506732', 'CMRP2506348',
        'CMRP2506277', 'CMRP2506739', 'CMRP2506252', 'CMRP2506816', 'CMRP2507135',
        'CMRP2507143', 'CMRP2507175', 'CMRP2507555', 'CMRP2507608', 'CMRP2507979',
        'CMRP2507485', 'CMRP2507129', 'CMRP2507801', 'CMRP2507646', 'CMRP2507300',
        'CMRP2508955'
    ]
    
    updated_count = 0
    temp_code_note = "NOTE: TEMPORARY PROJECT CODE - NEEDS PROPER EXISTING CODE ASSIGNMENT"
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.reader(infile)
        writer = csv.writer(outfile)
        
        for row_num, row in enumerate(reader, 1):
            if len(row) >= 29:  # Ensure we have enough columns
                project_code = row[2] if len(row) > 2 else ""
                remarks = row[28] if len(row) > 28 else ""
                
                # Check if this is a temporary code
                if project_code in temp_codes:
                    # Add note to remarks column
                    if remarks.strip():
                        # If there are existing remarks, prepend the note
                        row[28] = f"{temp_code_note}; {remarks}"
                    else:
                        # If no existing remarks, just add the note
                        row[28] = temp_code_note
                    
                    updated_count += 1
                    print(f"Updated row {row_num}: {row[1][:60]}... -> Added temp code note")
            
            writer.writerow(row)
    
    print(f"\nUpdated {updated_count} records with temporary code notes")
    print(f"Output saved to: {output_file}")

if __name__ == "__main__":
    update_temp_code_remarks()