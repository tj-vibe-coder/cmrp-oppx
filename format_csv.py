import csv
import uuid
from datetime import datetime
import re

def format_date(date_str):
    if not date_str or date_str.isspace() or date_str.lower() == 'tbi':
        return ""
    
    # Remove any quotes, extra whitespace, and TBI
    date_str = date_str.strip().strip('"').strip("'").replace('TBI', '')
    if not date_str:
        return ""
    
    # If already in YYYY-MM-DD format, validate and return
    if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except ValueError:
            pass
    
    # Try various date formats
    formats = [
        "%Y-%m-%d",     # 2025-01-01
        "%d/%m/%Y",     # 21/03/2025
        "%m/%d/%Y",     # 03/21/2025
        "%d-%m-%Y",     # 21-03-2025
        "%Y/%m/%d",     # 2025/01/01
        "%d/%m/%y",     # 21/3/25
        "%m/%d/%y",     # 3/21/25
        "%b %d, %Y",    # Mar 21, 2025
        "%B %d, %Y",    # March 21, 2025
        "%d %b %Y",     # 21 Mar 2025
        "%d %B %Y",     # 21 March 2025
        "%a, %b %d",    # Fri, Mar 21
        "%a,%b %d",     # Fri,Mar 21
        "%b %d",        # Mar 21
        "%d/%m",        # 21/3
        "%m/%d",        # 3/21
        "%d-%m",        # 21-3
        "%m-%d",        # 3-21
        "%Y.%m.%d",     # 2025.03.21
        "%d.%m.%Y",     # 21.03.2025
        "%d.%m.%y"      # 21.03.25
    ]
    
    # First try exact parsing
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            # If year is not specified or is 1900 (strptime default), set to 2025
            if dt.year == 1900 or fmt in ["%a, %b %d", "%a,%b %d", "%b %d", "%d/%m", "%m/%d", "%d-%m", "%m-%d"]:
                dt = dt.replace(year=2025)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # Try extracting date components with regex
    patterns = [
        r'(\d{1,2})[/-\.](\d{1,2})',            # 21/3 or 21-3 or 21.3
        r'(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*',  # 21 March
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{1,2})',  # March 21
    ]
    
    for pattern in patterns:
        match = re.search(pattern, date_str, re.IGNORECASE)
        if match:
            try:
                if match.group(1).isdigit() and match.group(2).isdigit():
                    # Numeric pattern (21/3)
                    day = int(match.group(1))
                    month = int(match.group(2))
                    # Swap if month > 12 and day <= 12
                    if month > 12 and day <= 12:
                        day, month = month, day
                else:
                    # Month name pattern
                    month_names = {
                        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
                        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
                    }
                    if match.group(1).isdigit():
                        day = int(match.group(1))
                        month = month_names[match.group(2)[:3].lower()]
                    else:
                        month = month_names[match.group(1)[:3].lower()]
                        day = int(match.group(2))
                
                # Validate day/month
                if 1 <= month <= 12 and 1 <= day <= 31:
                    dt = datetime(2025, month, day)
                    return dt.strftime("%Y-%m-%d")
            except (ValueError, KeyError):
                continue
    
    return ""

def format_number(num_str, is_margin=False):
    if not num_str or num_str.isspace():
        return ""
    
    # Remove any quotes and extra whitespace
    num_str = num_str.strip().strip('"').strip("'")
    if not num_str:
        return ""
    
    try:
        # Remove currency symbols, commas, and percentage signs
        cleaned = re.sub(r'[₱$,€£¥%]|\s+', '', num_str)
        if not cleaned:
            return ""
            
        # Convert to float and format with proper precision
        value = float(cleaned)
        
        # For margins, ensure it's a percentage without the % sign
        if is_margin:
            if value > 1 and value <= 100:
                return str(value)  # Already a percentage
            elif value <= 1:
                return str(value * 100)  # Convert decimal to percentage
            return ""  # Invalid margin
        
        # For amounts, return as integer if whole number
        if value.is_integer():
            return str(int(value))
        
        # For decimals, limit to 2 decimal places
        return "{:.2f}".format(value)
    except ValueError:
        return ""

def format_text(text):
    if not text or text.isspace():
        return ""
    return text.strip().strip('"').strip("'")

def main():
    input_file = "formatted_opps_monitoring.csv"
    output_file = "formatted_opps_monitoring_new.csv"
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        reader = csv.DictReader(infile)
        fieldnames = [
            "encoded_date", "project_name", "project_code", "rev", "client",
            "solutions", "sol_particulars", "industries", "ind_particulars",
            "date_received", "client_deadline", "decision", "account_mgr",
            "pic", "bom", "status", "submitted_date", "margin", "final_amt",
            "opp_status", "date_awarded_lost", "lost_rca", "l_particulars",
            "a", "c", "r", "u", "d", "remarks_comments", "uid", "forecast_date"
        ]
        
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        
        for row in reader:
            new_row = {}
            
            # Format dates
            date_fields = ["encoded_date", "date_received", "client_deadline",
                         "submitted_date", "date_awarded_lost", "forecast_date"]
            for field in date_fields:
                new_row[field] = format_date(row.get(field, ""))
            
            # Format numbers
            new_row["margin"] = format_number(row.get("margin", ""), is_margin=True)
            new_row["final_amt"] = format_number(row.get("final_amt", ""))
            new_row["rev"] = format_number(row.get("rev", "0"))
            
            # Format text fields
            text_fields = ["project_name", "project_code", "client", "solutions",
                         "sol_particulars", "industries", "ind_particulars",
                         "decision", "account_mgr", "pic", "bom", "status",
                         "opp_status", "lost_rca", "l_particulars", "a", "c",
                         "r", "u", "d", "remarks_comments"]
            for field in text_fields:
                new_row[field] = format_text(row.get(field, ""))
            
            # Keep existing UUID or generate new one
            new_row["uid"] = format_text(row.get("uid", "")) or str(uuid.uuid4())
            
            # Set forecast_date to date_awarded_lost if not provided
            if not new_row["forecast_date"] and new_row["date_awarded_lost"]:
                new_row["forecast_date"] = new_row["date_awarded_lost"]
            
            writer.writerow(new_row)
    
    # Replace original file with new formatted file
    import os
    os.replace(output_file, input_file)

if __name__ == "__main__":
    main() 