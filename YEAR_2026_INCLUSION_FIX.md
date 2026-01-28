# Year 2026 Inclusion Fix

## Summary
Updated all dashboards and reports to include data from both **2025** and **2026** (and current year if later).

## Changes Made

### 1. Win/Loss Dashboard (`win-loss_dashboard.js`)

**Quarter Filter Initialization:**
- **Before**: Only activated quarters up to current quarter in current year
- **After**: Activates **all quarters (Q1-Q4)** from both 2025 and 2026

**Data Filtering:**
- Added year check: includes data from 2025, 2026, and current year (if >= 2026)
- Quarter filtering now checks both year and quarter number

### 2. Executive Dashboard (`executive_dashboard.js`)

**Monthly Data Grouping:**
- **Before**: Only included data up to current month (`monthKey <= currentMonthKey`)
- **After**: Includes all data from 2025 and 2026, excluding only future months in current year

### 3. Awarded Projects (OP100)

**Confirmed**: OP100 status = Awarded projects
- When `opp_status` changes to **OP100**, the project is considered awarded
- Awarded projects are automatically available for sync to other app via `/api/awarded-projects`

## How It Works Now

### Win/Loss Dashboard
- **Quarter buttons**: All 4 quarters (Q1-Q4) are active by default
- **Data shown**: All awarded (OP100) and lost projects from 2025 and 2026
- **Charts**: Combine data by month across both years (e.g., all January data from both years)

### Executive Dashboard  
- **Historical chart**: Shows monthly data from 2025 and 2026
- **Metrics**: Include opportunities from both years

### Forecast Dashboard
- Already includes all forecast dates (no year filtering)
- Shows forecasts from any year in the database

## Testing

1. **Win/Loss Dashboard**: 
   - Should show all quarters active by default
   - Should display OP100 projects from both 2025 and 2026
   - Charts should include data from both years

2. **Executive Dashboard**:
   - Historical chart should show months from 2025 and 2026
   - Metrics should include opportunities from both years

3. **Awarded Projects API**:
   - OP100 projects should be available via `/api/awarded-projects`
   - When status changes to OP100, sync flag resets automatically

## Notes

- Charts group data by month (Jan-Dec) across all years - this is intentional
- If you need year-specific breakdowns, the data is available but currently combined by month
- All filtering now explicitly includes 2025 and 2026 data
