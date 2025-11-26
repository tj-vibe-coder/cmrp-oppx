// Quick Fix for Online Users - Improved Version
// Add this script to your pages for better cross-browser online user tracking

class OnlineUsersManager {
    constructor() {
        this.onlineUsers = new Map();
        this.currentUserId = null;
        this.currentUserInfo = null;
        this.heartbeatInterval = null;
        this.isServerAvailable = true;
        
        this.init();
    }
    
    init() {
        console.log('[ONLINE-USERS] Initializing...');
        
        // Get user info from token
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[ONLINE-USERS] No auth token found');
            return;
        }
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            this.currentUserId = payload.id;
            this.currentUserInfo = {
                id: payload.id,
                name: payload.name || payload.username || payload.email || 'Unknown User',
                email: payload.email,
                roles: payload.roles || [],
                accountType: payload.accountType || payload.account_type || 'User'
            };
            
            console.log('[ONLINE-USERS] User initialized:', this.currentUserInfo.name);
            this.updateUserDisplay();
            this.startHeartbeat();
            
        } catch (error) {
            console.error('[ONLINE-USERS] Failed to initialize:', error);
        }
    }
    
    updateUserDisplay() {
        const userNameEl = document.getElementById('currentUserName');
        const userRoleEl = document.getElementById('currentUserRole');
        
        if (userNameEl && this.currentUserInfo) {
            userNameEl.textContent = this.currentUserInfo.name;
        }
        
        if (userRoleEl && this.currentUserInfo) {
            const roles = this.currentUserInfo.roles.length > 0 
                ? this.currentUserInfo.roles.join(', ') 
                : this.currentUserInfo.accountType;
            userRoleEl.textContent = roles;
        }
    }
    
    async startHeartbeat() {
        // Test server connectivity first
        await this.testServerConnectivity();
        
        // Send initial heartbeat
        await this.sendHeartbeat();
        
        // Set up regular heartbeats
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000); // 30 seconds
        
        console.log('[ONLINE-USERS] Heartbeat started');
    }
    
    async testServerConnectivity() {
        try {
            const response = await fetch(this.getApiUrl('/api/health'));
            this.isServerAvailable = response.ok;
            console.log('[ONLINE-USERS] Server connectivity:', this.isServerAvailable ? 'OK' : 'Failed');
        } catch (error) {
            this.isServerAvailable = false;
            console.warn('[ONLINE-USERS] Server not available:', error.message);
        }
    }
    
    async sendHeartbeat() {
        if (!this.isServerAvailable) {
            console.log('[ONLINE-USERS] Using localStorage fallback (server unavailable)');
            this.fallbackToLocalStorage();
            return;
        }
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn('[ONLINE-USERS] No auth token for heartbeat');
            return;
        }
        
        try {
            console.log('[ONLINE-USERS] Sending heartbeat...');
            
            const response = await fetch(this.getApiUrl('/api/heartbeat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    page: window.location.pathname,
                    timestamp: Date.now()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('[ONLINE-USERS] Heartbeat successful:', data.totalOnline, 'users online');
                
                if (data.onlineUsers) {
                    this.updateOnlineUsers(data.onlineUsers);
                }
            } else {
                console.warn('[ONLINE-USERS] Heartbeat failed:', response.status);
                this.isServerAvailable = false;
                this.fallbackToLocalStorage();
            }
            
        } catch (error) {
            console.error('[ONLINE-USERS] Heartbeat error:', error);
            this.isServerAvailable = false;
            this.fallbackToLocalStorage();
        }
    }
    
    fallbackToLocalStorage() {
        // Use localStorage as fallback (works within same browser only)
        const heartbeatData = {
            userId: this.currentUserId,
            userInfo: this.currentUserInfo,
            timestamp: Date.now(),
            page: window.location.pathname
        };
        
        localStorage.setItem(`user_heartbeat_${this.currentUserId}`, JSON.stringify(heartbeatData));
        
        // Check for other users in localStorage
        this.checkLocalStorageUsers();
    }
    
    checkLocalStorageUsers() {
        const currentTime = Date.now();
        const maxAge = 60000; // 1 minute
        
        const heartbeatKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('user_heartbeat_')
        );
        
        const users = [];
        heartbeatKeys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (currentTime - data.timestamp <= maxAge) {
                    users.push({
                        id: data.userId,
                        name: data.userInfo.name,
                        email: data.userInfo.email,
                        lastSeen: data.timestamp,
                        page: data.page
                    });
                }
            } catch (error) {
                // Skip invalid entries
            }
        });
        
        this.updateOnlineUsers(users);
    }
    
    updateOnlineUsers(users) {
        this.onlineUsers.clear();
        
        users.forEach(user => {
            this.onlineUsers.set(user.id, user);
        });
        
        this.updateOnlineUsersDisplay();
    }
    
    updateOnlineUsersDisplay() {
        const countEl = document.getElementById('onlineCount');
        const listEl = document.getElementById('onlineUsersList');
        
        if (!countEl || !listEl) {
            return; // Elements not found
        }
        
        const users = Array.from(this.onlineUsers.values());
        countEl.textContent = users.length;
        
        listEl.innerHTML = '';
        
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'online-user-item';
            
            const isCurrentUser = user.id === this.currentUserId;
            const displayName = isCurrentUser ? 'You' : user.name;
            
            userDiv.innerHTML = `
                <span class="material-icons">${isCurrentUser ? 'account_circle' : 'person'}</span>
                <span class="online-user-name">${displayName}</span>
                ${user.page && user.page !== window.location.pathname ? 
                    `<span class="online-user-page" title="Currently on: ${user.page}">📄</span>` : ''}
            `;
            
            listEl.appendChild(userDiv);
        });
        
        console.log('[ONLINE-USERS] Display updated:', users.length, 'users');
    }
    
    getApiUrl(endpoint) {
        return (window.APP_CONFIG?.API_BASE_URL || '') + endpoint;
    }
    
    cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.currentUserId) {
            localStorage.removeItem(`user_heartbeat_${this.currentUserId}`);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if we have the required elements
    if (document.getElementById('currentUserName') && document.getElementById('onlineCount')) {
        window.onlineUsersManager = new OnlineUsersManager();
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', function() {
            if (window.onlineUsersManager) {
                window.onlineUsersManager.cleanup();
            }
        });
    }
});

// Export for manual initialization if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnlineUsersManager;
} 