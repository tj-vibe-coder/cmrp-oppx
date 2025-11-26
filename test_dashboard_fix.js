console.log('=== DASHBOARD FIX TEST ===');
console.log('Current user roles:', getCurrentUserRoles());
console.log('Total opportunities from dataset:', opportunities?.length);
console.log('Total opportunities displayed:', document.getElementById('totalOpportunities')?.textContent);
console.log('User is SALES:', getCurrentUserRoles().some(role => role.toUpperCase() === 'SALES'));
console.log('=== END TEST ===');
