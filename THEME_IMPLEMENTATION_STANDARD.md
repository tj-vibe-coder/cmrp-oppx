# 🎨 CMRP Theme Implementation Standard

## 📋 Overview
This document provides the standard implementation pattern for theme toggle functionality across all CMRP Opps Management pages. Follow this guide to ensure consistency when creating new pages or updating existing ones.

## ✅ Corrected Requirements (Updated June 2025)

### Theme Toggle Icon: 
- **ALWAYS show sun icon** (`wb_sunny`) regardless of current theme
- **DO NOT switch between sun/moon icons**

### CMRP Logo:
- **ALWAYS use light logo** (`Logo/CMRP Logo Light.svg`)
- Header uses dark colors in both themes, so light logo is always appropriate

### Login Button:
- **ALWAYS use blue color** (`#1a73e8`) in both light and dark themes
- **DO NOT use purple** in any theme

## 🏗️ Standard Implementation Pattern

### 1. HTML Structure
Every page should include a theme toggle button in the header:

```html
<button id="themeToggle" class="nav-square-btn" title="Toggle between light and dark theme">
    <span class="material-icons">wb_sunny</span>
</button>
```

### 2. CSS Requirements
Include the main styles.css file:

```html
<link rel="stylesheet" href="styles.css">
```

### 3. JavaScript Implementation

#### Required Functions:
```javascript
// --- THEME MANAGEMENT ---
function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update theme toggle button icon - ALWAYS show sun icon
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('.material-icons');
        if (icon) icon.textContent = 'wb_sunny';
    }
    
    // Update logo - ALWAYS use light logo (header is always dark)
    const logo = document.getElementById('cmrpLogo');
    if (logo) {
        logo.src = 'Logo/CMRP Logo Light.svg';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    
    // Re-render charts/components if needed
    // if (dashboardDataCache) {
    //     renderCharts(dashboardDataCache);
    // }
}
```

#### Theme Initialization:
```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme (defaults to dark mode)
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme || 'dark';
    if (savedTheme === null) {
        localStorage.setItem('theme', 'dark');
    }
    applyTheme(initialTheme);
    
    // Set up theme toggle button event handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // ... other initialization code ...
});
```

#### Cross-tab Theme Sync:
```javascript
// Sync theme changes across tabs/pages
window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
        const newTheme = e.newValue || 'light';
        applyTheme(newTheme);
    }
});
```

## 🎯 Icon Logic (CORRECTED REQUIREMENTS!)

**IMPORTANT**: Theme toggle icon ALWAYS shows sun icon regardless of current theme:

- **Dark Mode** (current): Show `wb_sunny` (sun icon) 
- **Light Mode** (current): Show `wb_sunny` (sun icon)
- **DO NOT switch between icons** - always use sun icon

## 🖼️ Logo Logic (CORRECTED REQUIREMENTS!)

- **Dark Mode**: Use `Logo/CMRP Logo Light.svg` (light logo on dark header)
- **Light Mode**: Use `Logo/CMRP Logo Light.svg` (light logo on dark header)
- **Header is ALWAYS dark** in both themes, so ALWAYS use light logo

## 🚀 Implementation Checklist

When creating a new page or updating an existing one:

- [ ] Include theme toggle button in HTML header
- [ ] Add `applyTheme(theme)` function
- [ ] Add `toggleTheme()` function
- [ ] Initialize theme in DOMContentLoaded event
- [ ] Set up theme toggle button event handler
- [ ] Add cross-tab theme sync listener
- [ ] Test icon toggling (sun in dark mode, moon in light mode)
- [ ] Test logo switching (light logo in dark mode, dark logo in light mode)
- [ ] Test theme persistence across page reloads
- [ ] Test default to dark mode for new users

## 📂 Files Following This Standard

✅ **Properly Implemented:**
- `app.js` (Main application)
- `win-loss_dashboard.js` (Win-Loss Dashboard)
- `executive_dashboard.js` (Executive Dashboard)
- `forecastr_dashboard.js` (Forecast Dashboard)
- `login.js` (Login Page)
- `user_management.html` (User Management)

## 🔧 Common Issues to Avoid

### ❌ OLD Wrong Icon Logic (Before June 2025):
```javascript
// OLD WAY - Was switching between icons (now incorrect)
icon.textContent = isDark ? 'wb_sunny' : 'dark_mode';
```

### ✅ NEW Correct Icon Logic (Current Standard):
```javascript
// CORRECT - Always shows sun icon regardless of theme
icon.textContent = 'wb_sunny';
```

### ❌ OLD Wrong Logo Logic (Before June 2025):
```javascript
// OLD WAY - Was switching logos (now incorrect)
logo.src = isDark ? 'Logo/CMRP Logo Light.svg' : 'Logo/CMRP Logo Dark.svg';
```

### ✅ NEW Correct Logo Logic (Current Standard):
```javascript
// CORRECT - Always use light logo (header is always dark)
logo.src = 'Logo/CMRP Logo Light.svg';
```
```javascript
// WRONG - Always shows same logo
logo.src = 'Logo/CMRP Logo Light.svg';
```

### ✅ Correct Logo Logic:
```javascript
// CORRECT - Shows appropriate logo for theme
logo.src = isDark ? 'Logo/CMRP Logo Light.svg' : 'Logo/CMRP Logo Dark.svg';
```

## 🧪 Testing Guidelines

### Manual Testing Steps:
1. **Fresh User Test**: Clear localStorage, reload page - should default to dark mode
2. **Icon Test**: Toggle theme, verify icon shows correct next state
3. **Logo Test**: Toggle theme, verify logo changes appropriately
4. **Persistence Test**: Reload page, verify theme is remembered
5. **Cross-tab Test**: Open multiple tabs, change theme in one, verify others sync

### Expected Behavior:
- New users (no localStorage) → Dark mode by default
- Theme toggle shows next action (sun in dark mode, moon in light mode)
- Logo matches theme (light logo in dark mode, dark logo in light mode)
- Theme persists across page reloads and tabs

## 📊 Current Status

All main dashboard pages now follow this standard implementation. Use this guide when:
- Creating new pages
- Fixing theme-related bugs
- Ensuring consistency across the application

---
**Last Updated:** June 7, 2025  
**Implementation Status:** ✅ Complete across all main pages  
**Next Steps:** Reference this guide for all future page development
