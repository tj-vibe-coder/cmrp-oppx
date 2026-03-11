// --- Login Page Logic ---
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');
    const loginSuccess = document.getElementById('loginSuccess');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    const loginLogo = document.getElementById('loginLogo');
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingLogo = document.getElementById('loadingLogo');

    // Logo theme logic - Use dark logo in light theme, light logo in dark theme
    // (opposite of header since login container is white in light theme)
    function updateLogo(theme) {
        if (loginLogo) {
            if (theme === 'light') {
                loginLogo.src = 'Logo/CMRP Logo Dark.svg';
            } else {
                loginLogo.src = 'Logo/CMRP Logo Light.svg';
            }
        }
        if (loadingLogo) {
            if (theme === 'light') {
                loadingLogo.src = 'Logo/CMRP Logo Dark.svg';
            } else {
                loadingLogo.src = 'Logo/CMRP Logo Light.svg';
            }
        }
    }

    // Theme logic - Always show sun icon
    function updateThemeToggleIcon(theme) {
        const icon = themeToggle?.querySelector('.material-icons');
        if (icon) {
            icon.textContent = 'wb_sunny';
        }
    }
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const theme = savedTheme || 'dark';
        if (savedTheme === null) {
            localStorage.setItem('theme', 'dark');
        }
        htmlElement.classList.toggle('dark', theme === 'dark');
        updateThemeToggleIcon(theme);
        updateLogo(theme);
    }
    function toggleTheme() {
        const currentTheme = htmlElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.classList.toggle('dark', newTheme === 'dark');
        localStorage.setItem('theme', newTheme);
        updateThemeToggleIcon(newTheme);
        updateLogo(newTheme);
    }
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    initializeTheme();

    // Check server status on page load - show login form after short wait so cold backend doesn't block
    const HEALTH_CHECK_TIMEOUT_MS = 6000;  // Show form after 6s even if backend hasn't responded
    async function checkServerStatus() {
        loadingScreen.classList.add('visible');
        const apiBase = (window.APP_CONFIG?.API_BASE_URL || '') + '/api/health';
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), HEALTH_CHECK_TIMEOUT_MS)
        );
        try {
            const response = await Promise.race([
                fetch(apiBase),
                timeoutPromise
            ]);
            if (response && response.ok) {
                console.log('[SERVER] Server is ready');
            }
        } catch (error) {
            if (error && error.message === 'timeout') {
                console.log('[SERVER] Backend may be waking up; showing login form. Sign in will retry.');
            } else {
                console.log('[SERVER] Server not yet ready:', error?.message || error);
            }
        }
        loadingScreen.classList.remove('visible');
    }

    checkServerStatus();

    // Login logic
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            loginError.classList.add('hidden');
            loginSuccess.classList.add('hidden');
            loginSubmitBtn.disabled = true;
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            if (!email || !password) {
                loginError.textContent = 'Email and password are required.';
                loginError.classList.remove('hidden');
                loginSubmitBtn.disabled = false;
                return;
            }
            try {
                loadingScreen.classList.add('visible');
                const primaryBase = window.APP_CONFIG?.API_BASE_URL || window.location.origin;
                const sameOrigin = window.location.origin;
                const loginPayload = JSON.stringify({ email, password });
                const fetchOpts = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: loginPayload
                };
                const tryLogin = (url) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 90000);
                    return fetch(url, { ...fetchOpts, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
                };
                let response;
                try {
                    response = await tryLogin(primaryBase + '/api/login');
                } catch (firstErr) {
                    if (sameOrigin !== primaryBase && (firstErr.name === 'TypeError' || firstErr.message === 'Failed to fetch' || firstErr.name === 'AbortError')) {
                        try {
                            response = await tryLogin(sameOrigin + '/api/login');
                        } catch (retryErr) {
                            throw firstErr;
                        }
                    } else {
                        throw firstErr;
                    }
                }
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.token) {
                    throw new Error(data.error || 'Login failed');
                }
                localStorage.setItem('authToken', data.token);
                console.log('[LOGIN DEBUG] Token stored in localStorage');
                console.log('[LOGIN DEBUG] Token preview:', data.token.substring(0, 50) + '...');
                loginSuccess.classList.remove('hidden');
                
                // Decode token to check roles
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                const userRoles = payload.roles || [];
                
                // Longer delay and ensure token is properly stored before redirect
                setTimeout(() => {
                    // Double-check token was stored successfully
                    const storedToken = localStorage.getItem('authToken');
                    console.log('[LOGIN DEBUG] Verifying stored token:', !!storedToken);
                    
                    if (storedToken) {
                        // Check if user has DS or SE role and redirect accordingly
                        if (userRoles.includes('DS') || userRoles.includes('SE')) {
                            console.log('[LOGIN DEBUG] DS/SE role detected, redirecting to proposal workbench');
                            window.location.href = 'proposal_workbench.html';
                        } else {
                            console.log('[LOGIN DEBUG] Standard role, redirecting to index.html');
                            window.location.href = 'index.html';
                        }
                    } else {
                        console.error('[LOGIN DEBUG] Token storage failed, retrying...');
                        localStorage.setItem('authToken', data.token);
                        setTimeout(() => {
                            // Check roles again in retry
                            if (userRoles.includes('DS') || userRoles.includes('SE')) {
                                console.log('[LOGIN DEBUG] DS/SE role detected (retry), redirecting to proposal workbench');
                                window.location.href = 'proposal_workbench.html';
                            } else {
                                console.log('[LOGIN DEBUG] Standard role (retry), redirecting to index.html');
                                window.location.href = 'index.html';
                            }
                        }, 200);
                    }
                }, 1500); // Increased delay to 1500ms
            } catch (err) {
                loadingScreen.classList.remove('visible');
                const isNetworkError = !err.response && (err.name === 'TypeError' || err.message === 'Failed to fetch' || err.name === 'AbortError');
                loginError.textContent = isNetworkError
                    ? 'Cannot reach the server. The backend may be waking up—wait 30–60 seconds and try again.'
                    : (err.message || 'Login failed.');
                loginError.classList.remove('hidden');
            } finally {
                loginSubmitBtn.disabled = false;
            }
        });
    }
});
