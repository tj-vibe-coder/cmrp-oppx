// === TABLE SETTINGS PERSISTENCE TEST SCRIPT ===
// Run this in the browser console on the main index page

console.log("🧪 Starting Table Settings Persistence Test");

// Test 1: Check if preference functions exist
console.log("1️⃣ Checking if preference functions exist...");
const functionsExist = {
    saveUserPreferences: typeof saveUserPreferences === "function",
    loadUserPreferences: typeof loadUserPreferences === "function", 
    getActiveFilters: typeof getActiveFilters === "function",
    getCurrentUserId: typeof getCurrentUserId === "function"
};
console.log("Functions available:", functionsExist);

// Test 2: Check current user and preferences
console.log("2️⃣ Checking current user and stored preferences...");
const userId = getCurrentUserId();
console.log("Current user ID:", userId);

if (userId) {
    const prefKey = `userPreferences_${userId}`;
    const stored = localStorage.getItem(prefKey);
    console.log("Stored preferences key:", prefKey);
    console.log("Stored preferences exist:", !!stored);
    if (stored) {
        try {
            const prefs = JSON.parse(stored);
            console.log("Stored preferences:", prefs);
        } catch (e) {
            console.error("Error parsing stored preferences:", e);
        }
    }
}

// Test 3: Check current filter state
console.log("3️⃣ Checking current filter state...");
const currentFilters = getActiveFilters();
console.log("Current filters:", currentFilters);

// Test 4: Check filter buttons
console.log("4️⃣ Checking filter buttons...");
const filterButtons = document.querySelectorAll(".filter-button[data-filter-value]");
console.log("Total filter buttons found:", filterButtons.length);
filterButtons.forEach((btn, index) => {
    console.log(`Button ${index + 1}: ${btn.dataset.filterValue} - Active: ${btn.classList.contains("active")}`);
});

// Test 5: Check column widths
console.log("5️⃣ Checking column widths...");
console.log("Column widths object:", columnWidths);
console.log("Number of stored column widths:", Object.keys(columnWidths).length);

// Test 6: Test manual save
console.log("6️⃣ Testing manual save...");
console.log("Calling saveUserPreferences()...");
saveUserPreferences();
console.log("Save function called. Check console for PREFERENCES logs.");

console.log("✅ Test script completed. Check the logs above for any issues.");
console.log("💡 To test persistence:");
console.log("1. Apply some filters by clicking buttons");
console.log("2. Resize some columns");
console.log("3. Run this script again");
console.log("4. Refresh the page");
console.log("5. Check if settings are restored");

