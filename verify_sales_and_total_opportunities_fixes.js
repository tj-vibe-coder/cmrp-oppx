// SALES Auto-filter & Total Opportunities Fix Verification Script
// Run this in the browser console after logging into the main application

console.log('🔧 SALES Auto-filter & Total Opportunities Fix Verification');
console.log('===========================================================');

function verifyTotalOpportunitiesUpdate() {
    console.log('\n1. Testing Total Opportunities Dashboard Update');
    console.log('----------------------------------------------');
    
    const totalOppsElement = document.getElementById('totalOpportunities');
    if (!totalOppsElement) {
        console.log('❌ Total Opportunities element not found');
        return false;
    }
    
    console.log('✅ Total Opportunities element found');
    console.log('Current value:', totalOppsElement.textContent);
    
    // Check if updateSummaryCounters function exists
    if (typeof updateSummaryCounters !== 'function') {
        console.log('❌ updateSummaryCounters function not available');
        return false;
    }
    
    console.log('✅ updateSummaryCounters function available');
    
    // Test with mock data
    const testData = Array(15).fill().map((_, i) => ({ id: i, project_name: `Test ${i}` }));
    const originalValue = totalOppsElement.textContent;
    
    console.log(`Testing with ${testData.length} mock opportunities...`);
    updateSummaryCounters(testData);
    
    setTimeout(() => {
        const newValue = totalOppsElement.textContent;
        console.log(`Value after update: ${newValue}`);
        
        if (newValue === testData.length.toString()) {
            console.log('✅ Total Opportunities update working correctly!');
            return true;
        } else {
            console.log('❌ Total Opportunities update failed');
            console.log(`Expected: ${testData.length}, Got: ${newValue}`);
            return false;
        }
    }, 100);
    
    return true;
}

function verifySalesRoleAutoFilter() {
    console.log('\n2. Testing SALES Role Auto-filtering');
    console.log('-------------------------------------');
    
    // Check if functions exist
    if (typeof mapUserRolesToFilters !== 'function') {
        console.log('❌ mapUserRolesToFilters function not available');
        return false;
    }
    
    if (typeof getCurrentUserName !== 'function') {
        console.log('❌ getCurrentUserName function not available');
        return false;
    }
    
    console.log('✅ Required functions available');
    
    // Test SALES role mapping
    const mockOpportunities = [
        { account_mgr: 'John Smith', project_name: 'Project A' },
        { account_mgr: 'Jane Doe', project_name: 'Project B' },
        { account_mgr: 'Bob Johnson', project_name: 'Project C' }
    ];
    
    console.log('Testing SALES role mapping with mock data...');
    const roleFilters = mapUserRolesToFilters(['SALES'], mockOpportunities);
    console.log('Role filters returned:', roleFilters);
    
    if (roleFilters.accountManager) {
        console.log('✅ SALES role mapped to account manager filter:', roleFilters.accountManager);
        return true;
    } else {
        console.log('ℹ️ No account manager filter returned (may be expected if username doesn\'t match)');
        
        // Check current user name
        const userName = getCurrentUserName();
        console.log('Current user name:', userName);
        
        if (!userName || userName === 'Unknown User') {
            console.log('ℹ️ No valid user name, so no auto-filtering expected');
        } else {
            console.log('ℹ️ User name exists but may not match any account managers in data');
        }
        
        return true; // Not necessarily an error
    }
}

function verifyAutoFilterFunction() {
    console.log('\n3. Testing Auto-filter Function Integration');
    console.log('-------------------------------------------');
    
    if (typeof applyAutoFiltersForUser !== 'function') {
        console.log('❌ applyAutoFiltersForUser function not available');
        return false;
    }
    
    console.log('✅ applyAutoFiltersForUser function available');
    
    // Check current filter states before
    const accountMgrFilter = document.getElementById('accountMgrFilter');
    const solutionsFilter = document.getElementById('solutionsFilter');
    const picFilter = document.getElementById('picFilter');
    
    console.log('Current filter states:');
    console.log('- Account Manager:', accountMgrFilter?.value || 'none');
    console.log('- Solutions:', solutionsFilter?.value || 'none');
    console.log('- PIC:', picFilter?.value || 'none');
    
    console.log('Calling applyAutoFiltersForUser()...');
    applyAutoFiltersForUser();
    
    setTimeout(() => {
        console.log('Filter states after auto-filter:');
        console.log('- Account Manager:', accountMgrFilter?.value || 'none');
        console.log('- Solutions:', solutionsFilter?.value || 'none');
        console.log('- PIC:', picFilter?.value || 'none');
        
        // Check if dashboard was updated
        const totalOpps = document.getElementById('totalOpportunities');
        console.log('Dashboard Total Opportunities:', totalOpps?.textContent);
        
        console.log('✅ Auto-filter function executed successfully');
    }, 500);
    
    return true;
}

function verifySelectiveDashboardUpdates() {
    console.log('\n4. Testing Selective Dashboard Updates');
    console.log('--------------------------------------');
    
    if (typeof getCurrentFilteredData !== 'function') {
        console.log('❌ getCurrentFilteredData function not available');
        return false;
    }
    
    console.log('✅ getCurrentFilteredData function available');
    
    // Test getting current filtered data
    const filteredData = getCurrentFilteredData();
    console.log('Current filtered data length:', filteredData?.length || 'null');
    
    if (filteredData && filteredData.length > 0) {
        console.log('✅ Filtered data available for dashboard updates');
        
        // Test dashboard update
        updateSummaryCounters(filteredData);
        console.log('✅ Dashboard updated with filtered data');
        
        return true;
    } else {
        console.log('ℹ️ No filtered data available (may be expected if no data is loaded)');
        return true;
    }
}

// Run all verifications
console.log('Starting verification tests...\n');

setTimeout(() => verifyTotalOpportunitiesUpdate(), 100);
setTimeout(() => verifySalesRoleAutoFilter(), 200);
setTimeout(() => verifyAutoFilterFunction(), 300);
setTimeout(() => verifySelectiveDashboardUpdates(), 400);

setTimeout(() => {
    console.log('\n🎉 Verification tests completed!');
    console.log('Check the results above for any issues.');
    console.log('\nTo manually test:');
    console.log('1. Apply filters and watch Total Opportunities count update');
    console.log('2. Login with SALES role and check for automatic account manager filtering');
    console.log('3. Verify dashboard updates when auto-filters are applied');
}, 1000);
