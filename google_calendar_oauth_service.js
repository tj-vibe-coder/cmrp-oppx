const { google } = require('googleapis');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection using existing configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://cmrp_user:cmrp0601@100.118.59.44:5432/cmrp_opps_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Set search path for all new connections
pool.on('connect', (client) => {
  client.query('SET search_path TO public');
});

// OAuth Configuration
const GOOGLE_CALENDAR_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
};

class GoogleCalendarOAuthService {
  constructor() {
    this.oauth2Client = null;
    this.calendar = null;
  }

  initialize() {
    try {
      console.log('🔑 Initializing Google Calendar OAuth service...');
      
      if (!GOOGLE_CALENDAR_OAUTH_CONFIG.clientId || !GOOGLE_CALENDAR_OAUTH_CONFIG.clientSecret) {
        console.warn('⚠️ Google OAuth credentials not configured. Calendar features will be disabled.');
        console.log('📋 To enable Google Calendar sync:');
        console.log('   1. Go to Google Cloud Console');
        console.log('   2. Enable Calendar API');
        console.log('   3. Create OAuth 2.0 credentials');
        console.log('   4. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET to .env');
        console.log('   5. See GOOGLE_CALENDAR_SETUP.md for detailed instructions');
        return false;
      }

      if (GOOGLE_CALENDAR_OAUTH_CONFIG.clientId.includes('your_client_id_here') || 
          GOOGLE_CALENDAR_OAUTH_CONFIG.clientSecret.includes('your_client_secret_here')) {
        console.warn('⚠️ Google OAuth credentials contain placeholder values. Please update .env with real credentials.');
        return false;
      }

      this.oauth2Client = new google.auth.OAuth2(
        GOOGLE_CALENDAR_OAUTH_CONFIG.clientId,
        GOOGLE_CALENDAR_OAUTH_CONFIG.clientSecret,
        GOOGLE_CALENDAR_OAUTH_CONFIG.redirectUri
      );

      this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      console.log('✅ Google Calendar OAuth service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar OAuth service:', error.message);
      return false;
    }
  }

  generateAuthUrl(state = null) {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get refresh token
        prompt: 'consent',      // Force consent to ensure refresh token
        scope: GOOGLE_CALENDAR_OAUTH_CONFIG.scopes,
        state: state            // Can include user ID or other state data
      });

      console.log('🔗 Generated OAuth authorization URL');
      return authUrl;
    } catch (error) {
      console.error('❌ Failed to generate auth URL:', error.message);
      throw error;
    }
  }

  async handleOAuthCallback(authorizationCode, userId, username) {
    try {
      console.log(`🔄 Processing OAuth callback for user: ${username}`);

      if (!this.oauth2Client) {
        throw new Error('OAuth client not initialized');
      }

      if (!authorizationCode) {
        throw new Error('No authorization code provided');
      }

      // Exchange authorization code for tokens
      console.log('📝 Exchanging authorization code for tokens...');
      console.log('📝 Authorization code length:', authorizationCode?.length || 'undefined');
      
      let response;
      try {
        response = await this.oauth2Client.getAccessToken({
          code: authorizationCode
        });
      } catch (oauthError) {
        console.error('❌ OAuth getAccessToken error:', oauthError.message);
        console.error('❌ Error details:', oauthError.response?.data || 'No additional details');
        return {
          success: false,
          error: `Google OAuth failed: ${oauthError.message}`
        };
      }
      
      console.log('📝 OAuth response received:', !!response);
      console.log('📝 Response has tokens:', !!(response && response.tokens));
      
      if (!response || !response.tokens) {
        console.error('❌ OAuth response:', response);
        return {
          success: false,
          error: 'Google returned empty response - authorization code may be expired or already used'
        };
      }
      
      const { tokens } = response;
      console.log('✅ Successfully exchanged authorization code for tokens');
      console.log('📝 Tokens received - access_token:', !!tokens.access_token, 'refresh_token:', !!tokens.refresh_token);

      // Set credentials to get user info
      this.oauth2Client.setCredentials(tokens);

      // Get user's Google profile info
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const googleEmail = userInfo.data.email;

      console.log(`👤 Connected to Google account: ${googleEmail}`);

      // Get user's primary calendar ID
      const calendarList = await this.calendar.calendarList.list();
      const primaryCalendar = calendarList.data.items.find(cal => cal.primary);
      const calendarId = primaryCalendar ? primaryCalendar.id : googleEmail;

      // Store tokens in database
      await this.storeUserTokens(userId, username, tokens, googleEmail, calendarId);

      return {
        success: true,
        googleEmail: googleEmail,
        calendarId: calendarId
      };

    } catch (error) {
      console.error('❌ Failed to handle OAuth callback:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async storeUserTokens(userId, username, tokens, googleEmail, calendarId) {
    const client = await pool.connect();
    
    try {
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
      const scopes = GOOGLE_CALENDAR_OAUTH_CONFIG.scopes.join(' ');

      await client.query(`
        INSERT INTO user_calendar_tokens (
          user_id, username, google_email, access_token, refresh_token, 
          token_expires_at, scope, calendar_id, sync_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (user_id) DO UPDATE SET
          google_email = EXCLUDED.google_email,
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          scope = EXCLUDED.scope,
          calendar_id = EXCLUDED.calendar_id,
          sync_enabled = EXCLUDED.sync_enabled,
          updated_at = CURRENT_TIMESTAMP
      `, [userId, username, googleEmail, tokens.access_token, tokens.refresh_token, 
          expiresAt, scopes, calendarId, true]);

      console.log(`✅ Stored OAuth tokens for user: ${username}`);

    } catch (error) {
      console.error('❌ Failed to store user tokens:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserTokens(userId) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM user_calendar_tokens WHERE user_id = $1 AND sync_enabled = TRUE',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];

    } catch (error) {
      console.error('❌ Failed to get user tokens:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async refreshAccessToken(userId) {
    try {
      const userTokens = await this.getUserTokens(userId);
      if (!userTokens) {
        throw new Error('No tokens found for user');
      }

      console.log(`🔄 Refreshing access token for user: ${userTokens.username}`);

      this.oauth2Client.setCredentials({
        refresh_token: userTokens.refresh_token
      });

      // Refresh the token
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      const client = await pool.connect();
      try {
        const expiresAt = credentials.expiry_date ? new Date(credentials.expiry_date) : null;
        
        await client.query(
          'UPDATE user_calendar_tokens SET access_token = $1, token_expires_at = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
          [credentials.access_token, expiresAt, userId]
        );

        console.log(`✅ Refreshed access token for user: ${userTokens.username}`);
        return credentials;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ Failed to refresh access token:', error.message);
      throw error;
    }
  }

  async ensureValidTokens(userId) {
    try {
      const userTokens = await this.getUserTokens(userId);
      if (!userTokens) {
        throw new Error('User not connected to Google Calendar');
      }

      // Check if token is expired or will expire in the next 5 minutes
      const now = new Date();
      const expiresAt = new Date(userTokens.token_expires_at);
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

      if (expiresAt <= fiveMinutesFromNow) {
        console.log('🔄 Access token expired or expiring soon, refreshing...');
        await this.refreshAccessToken(userId);
        return await this.getUserTokens(userId); // Get updated tokens
      }

      // Set current credentials
      this.oauth2Client.setCredentials({
        access_token: userTokens.access_token,
        refresh_token: userTokens.refresh_token
      });

      return userTokens;

    } catch (error) {
      console.error('❌ Failed to ensure valid tokens:', error.message);
      throw error;
    }
  }

  async syncUserCalendarEvents(userId, timeMin = null, timeMax = null) {
    try {
      console.log(`📅 Starting calendar sync for user ID: ${userId}`);

      // Ensure we have valid tokens
      const userTokens = await this.ensureValidTokens(userId);
      
      // Default to current week if no time range specified
      if (!timeMin) {
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay() + 1)); // Monday
        weekStart.setHours(0, 0, 0, 0);
        timeMin = weekStart.toISOString();
      }

      if (!timeMax) {
        const weekEnd = new Date(timeMin);
        weekEnd.setDate(weekEnd.getDate() + 7); // Next Monday
        timeMax = weekEnd.toISOString();
      }

      console.log(`📅 Syncing events from ${timeMin} to ${timeMax}`);

      // Fetch events from Google Calendar
      const eventsResponse = await this.calendar.events.list({
        calendarId: userTokens.calendar_id,
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      const events = eventsResponse.data.items || [];
      console.log(`📊 Found ${events.length} calendar events to sync`);

      // Process and store events
      const syncResults = {
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0
      };

      for (const event of events) {
        try {
          await this.storeCalendarEvent(userId, userTokens.calendar_id, event);
          syncResults.processed++;
          syncResults.created++; // Simplified - could track created vs updated
        } catch (error) {
          console.error(`❌ Failed to store event ${event.id}:`, error.message);
          syncResults.errors++;
        }
      }

      // Update last sync time
      await this.updateLastSyncTime(userId);

      console.log(`✅ Calendar sync completed for user ${userTokens.username}:`, syncResults);
      return syncResults;

    } catch (error) {
      console.error('❌ Calendar sync failed:', error.message);
      throw error;
    }
  }

  async storeCalendarEvent(userId, calendarId, googleEvent) {
    const client = await pool.connect();
    
    try {
      // Parse event times
      const startDateTime = googleEvent.start?.dateTime || googleEvent.start?.date;
      const endDateTime = googleEvent.end?.dateTime || googleEvent.end?.date;
      const isAllDay = !googleEvent.start?.dateTime; // If no time, it's all-day

      // Convert date-only events to proper timestamps
      let startTimestamp, endTimestamp;
      if (isAllDay) {
        startTimestamp = new Date(googleEvent.start.date + 'T00:00:00');
        endTimestamp = new Date(googleEvent.end.date + 'T23:59:59');
      } else {
        startTimestamp = new Date(startDateTime);
        endTimestamp = new Date(endDateTime);
      }

      // Prepare attendees JSON
      const attendees = googleEvent.attendees ? JSON.stringify(googleEvent.attendees) : null;

      await client.query(`
        INSERT INTO calendar_events (
          user_id, google_event_id, calendar_id, summary, description,
          start_datetime, end_datetime, is_all_day, location, attendees,
          status, visibility, event_created_at, event_updated_at, is_deleted
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (google_event_id, calendar_id) DO UPDATE SET
          summary = EXCLUDED.summary,
          description = EXCLUDED.description,
          start_datetime = EXCLUDED.start_datetime,
          end_datetime = EXCLUDED.end_datetime,
          is_all_day = EXCLUDED.is_all_day,
          location = EXCLUDED.location,
          attendees = EXCLUDED.attendees,
          status = EXCLUDED.status,
          visibility = EXCLUDED.visibility,
          event_updated_at = EXCLUDED.event_updated_at,
          synced_at = CURRENT_TIMESTAMP,
          is_deleted = FALSE
      `, [
        userId,
        googleEvent.id,
        calendarId,
        googleEvent.summary || 'No Title',
        googleEvent.description || null,
        startTimestamp,
        endTimestamp,
        isAllDay,
        googleEvent.location || null,
        attendees,
        googleEvent.status || 'confirmed',
        googleEvent.visibility || 'default',
        googleEvent.created ? new Date(googleEvent.created) : new Date(),
        googleEvent.updated ? new Date(googleEvent.updated) : new Date(),
        false
      ]);

    } catch (error) {
      console.error('❌ Failed to store calendar event:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateLastSyncTime(userId) {
    const client = await pool.connect();
    
    try {
      await client.query(
        'UPDATE user_calendar_tokens SET last_sync_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
    } catch (error) {
      console.error('❌ Failed to update last sync time:', error.message);
    } finally {
      client.release();
    }
  }

  async getUserCalendarStatus(userId) {
    try {
      const userTokens = await this.getUserTokens(userId);
      
      if (!userTokens) {
        return {
          connected: false,
          message: 'Not connected to Google Calendar'
        };
      }

      return {
        connected: true,
        googleEmail: userTokens.google_email,
        calendarId: userTokens.calendar_id,
        lastSync: userTokens.last_sync_at,
        syncEnabled: userTokens.sync_enabled
      };

    } catch (error) {
      console.error('❌ Failed to get calendar status:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async disconnectUserCalendar(userId) {
    const client = await pool.connect();
    
    try {
      console.log(`🔌 Disconnecting calendar for user ID: ${userId}`);

      // Soft delete: disable sync and clear tokens
      await client.query(`
        UPDATE user_calendar_tokens 
        SET sync_enabled = FALSE,
            access_token = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [userId]);

      // Mark calendar events as deleted
      await client.query(`
        UPDATE calendar_events 
        SET is_deleted = TRUE,
            synced_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
      `, [userId]);

      console.log('✅ Successfully disconnected user calendar');
      return { success: true };

    } catch (error) {
      console.error('❌ Failed to disconnect calendar:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async getWeeklyScheduleWithCalendar(weekStartDate, userId = null) {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT * FROM get_weekly_schedule_with_calendar($1, $2)',
        [weekStartDate, userId]
      );

      const scheduleData = {};
      
      // Initialize all days
      for (let i = 0; i < 7; i++) {
        scheduleData[i] = {
          proposals: [],
          calendarEvents: []
        };
      }

      // Populate with data from database
      result.rows.forEach(row => {
        scheduleData[row.day_index] = {
          proposals: row.proposals || [],
          calendarEvents: row.calendar_events || []
        };
      });

      return {
        success: true,
        weekStart: weekStartDate,
        schedule: scheduleData
      };

    } catch (error) {
      console.error('❌ Failed to get weekly schedule with calendar:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupOldEvents(daysToKeep = 30) {
    const client = await pool.connect();
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await client.query(`
        DELETE FROM calendar_events 
        WHERE end_datetime < $1 
        AND synced_at < $1
      `, [cutoffDate]);

      console.log(`🧹 Cleaned up ${result.rowCount} old calendar events`);
      return result.rowCount;

    } catch (error) {
      console.error('❌ Failed to cleanup old events:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async bulkSyncAllUsers() {
    try {
      console.log('🔄 Starting bulk sync for all connected users...');

      const client = await pool.connect();
      let users;
      
      try {
        const result = await client.query(
          'SELECT user_id, username FROM user_calendar_tokens WHERE sync_enabled = TRUE'
        );
        users = result.rows;
      } finally {
        client.release();
      }

      console.log(`👥 Found ${users.length} users with calendar sync enabled`);

      const syncResults = {
        totalUsers: users.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const user of users) {
        try {
          await this.syncUserCalendarEvents(user.user_id);
          syncResults.successful++;
          console.log(`✅ Synced calendar for user: ${user.username}`);
        } catch (error) {
          syncResults.failed++;
          syncResults.errors.push({
            userId: user.user_id,
            username: user.username,
            error: error.message
          });
          console.error(`❌ Failed to sync calendar for user ${user.username}:`, error.message);
        }
      }

      console.log('🎯 Bulk sync completed:', syncResults);
      return syncResults;

    } catch (error) {
      console.error('❌ Bulk sync failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other modules
module.exports = GoogleCalendarOAuthService;

// Allow running this script directly for testing
if (require.main === module) {
  const calendarService = new GoogleCalendarOAuthService();
  
  // Test initialization
  const initialized = calendarService.initialize();
  if (initialized) {
    console.log('✅ Google Calendar OAuth service test completed successfully');
    
    // Generate a test auth URL
    try {
      const authUrl = calendarService.generateAuthUrl('test-state');
      console.log('🔗 Test Auth URL:', authUrl);
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  } else {
    console.error('❌ Google Calendar OAuth service test failed');
  }
}