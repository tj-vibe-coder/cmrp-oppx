import csv

total = 0.0
rows = 0
with open('Opportunity_All - 2025_Opportunities.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        status = (row.get('Status') or '').strip().lower()
        amt = (row.get('Final amt') or '').replace('₱', '').replace(',', '').strip()
        if status == 'submitted':
            rows += 1
            try:
                total += float(amt)
            except ValueError:
                pass  # skip rows with invalid amounts
print(f"Total Submitted Amount: {total:,.2f} (from {rows} rows)") 