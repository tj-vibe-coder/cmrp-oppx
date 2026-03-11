const { google } = require('googleapis');
const db = require('./db_adapter');
require('dotenv').config();

class GoogleTasksService {
  constructor(calendarOAuthService) {
    this.calendarOAuthService = calendarOAuthService;
  }

  /**
   * Send email notification via Gmail API when user is assigned as PIC.
   * Uses the assigner's OAuth tokens to send from their Gmail.
   * Falls back to the assigned user's tokens if assigner tokens unavailable.
   */
  async sendAssignmentEmail({ assignedUserId, assignedByUserId, projectCode, projectName, client, assignedByName, opportunityUid, driveFolderUrl }) {
    try {
      // Get the assigned user's Google email (recipient)
      const userTokens = await this.calendarOAuthService.getUserTokens(assignedUserId);
      if (!userTokens || !userTokens.google_email) {
        console.log(`[GOOGLE-TASKS] No Google email found for user ${assignedUserId}, skipping email`);
        return { success: false, reason: 'no_recipient_email' };
      }

      const toEmail = userTokens.google_email;

      // Determine sender: prefer assigner, fall back to assignee
      let senderUserId = assignedByUserId || assignedUserId;
      let senderTokens = null;

      if (assignedByUserId) {
        try {
          senderTokens = await this.calendarOAuthService.ensureValidTokens(assignedByUserId);
        } catch (e) {
          console.log(`[GOOGLE-TASKS] Assigner (${assignedByUserId}) has no valid tokens, falling back to assignee`);
        }
      }

      if (!senderTokens) {
        // Fall back to assignee's tokens
        senderUserId = assignedUserId;
        senderTokens = await this.calendarOAuthService.ensureValidTokens(assignedUserId);
      }

      const subject = `[CMRP OppX] New PIC Assignment: ${projectName}`;
      const body = [
        `Hi,`,
        ``,
        `You have been assigned as PIC for the following project:`,
        ``,
        projectCode ? `  Project No.: ${projectCode}` : null,
        `  Project: ${projectName}`,
        `  Client: ${client || 'N/A'}`,
        `  Assigned by: ${assignedByName || 'System'}`,
        driveFolderUrl ? `  Google Drive: ${driveFolderUrl}` : null,
        ``,
        `A Google Task has been created in your task list.`,
        `The task will be automatically completed when the proposal is submitted.`,
        ``,
        `— CMRP OppX`,
        ``,
        `This is a computer-generated email. Please do not reply.`
      ].filter(l => l !== null).join('\n');

      // Build the raw email
      const rawMessage = [
        `To: ${toEmail}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        body
      ].join('\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Use the sender's (assigner's) tokens to send via their Gmail
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
      );

      oauth2Client.setCredentials({
        access_token: senderTokens.access_token,
        refresh_token: senderTokens.refresh_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });

      console.log(`[GOOGLE-TASKS] Assignment email sent to ${toEmail} (from user ${senderUserId})`);
      return { success: true, email: toEmail, sentBy: senderUserId };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Failed to send email:`, error.message);
      // Don't throw — email failure shouldn't block task creation
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto-sync: Create Google Task + send email when PIC is assigned.
   * Called directly from PIC assignment hooks.
   */
  async onPICAssigned({ userId, assignedByUserId, opportunityUid, projectCode, projectName, client, assignedByName, dueDate, driveFolderUrl }) {
    const results = { task: null, email: null };

    // 1. Create Google Task
    results.task = await this.createTaskForPICAssignment({
      userId, opportunityUid, projectName, client, assignedByName, dueDate
    });

    // 2. Send email notification (from assigner to assignee)
    results.email = await this.sendAssignmentEmail({
      assignedUserId: userId, assignedByUserId, projectCode, projectName, client, assignedByName, opportunityUid, driveFolderUrl
    });

    return results;
  }

  /**
   * Get an authenticated Tasks API client for a user
   */
  async getTasksClient(userId) {
    // Ensure valid OAuth tokens using the existing calendar OAuth service
    const userTokens = await this.calendarOAuthService.ensureValidTokens(userId);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
    );

    oauth2Client.setCredentials({
      access_token: userTokens.access_token,
      refresh_token: userTokens.refresh_token
    });

    return google.tasks({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Create a Google Task when a user is assigned as PIC
   */
  async createTaskForPICAssignment({ userId, opportunityUid, projectName, client, assignedByName, dueDate }) {
    try {
      console.log(`[GOOGLE-TASKS] Creating task for PIC assignment: user=${userId}, project=${projectName}`);

      const tasksClient = await this.getTasksClient(userId);

      // Check if a task already exists for this opportunity
      const existing = await db.query(
        'SELECT * FROM google_tasks_mapping WHERE user_id = ? AND opportunity_uid = ?',
        [userId, opportunityUid]
      );

      if (existing.rows.length > 0 && existing.rows[0].status !== 'completed') {
        // Verify the task still exists in Google Tasks (user may have deleted it)
        try {
          const existingTask = await tasksClient.tasks.get({
            tasklist: existing.rows[0].task_list_id || '@default',
            task: existing.rows[0].google_task_id
          });
          // Also check if Google marked it as deleted
          if (existingTask.data.deleted) {
            throw new Error('Task marked as deleted');
          }
          console.log(`[GOOGLE-TASKS] Task already exists for this assignment, skipping`);
          return { success: true, existing: true, googleTaskId: existing.rows[0].google_task_id };
        } catch (verifyError) {
          // Task was deleted from Google — remove old mapping and recreate
          console.log(`[GOOGLE-TASKS] Task was deleted from Google, recreating...`);
          await db.query(
            'DELETE FROM google_tasks_mapping WHERE user_id = ? AND opportunity_uid = ?',
            [userId, opportunityUid]
          );
        }
      }

      // If no due date passed, look it up from the database
      if (!dueDate) {
        try {
          const oppResult = await db.query(
            'SELECT forecast_date, submitted_date FROM opps_monitoring WHERE uid = ?',
            [opportunityUid]
          );
          if (oppResult.rows.length > 0) {
            dueDate = oppResult.rows[0].forecast_date || oppResult.rows[0].submitted_date || null;
          }
        } catch (e) {
          console.warn(`[GOOGLE-TASKS] Could not fetch due date for ${opportunityUid}:`, e.message);
        }
      }

      // Create the task in Google Tasks
      const taskTitle = `[PIC] ${projectName}${client ? ' - ' + client : ''}`;
      const taskNotes = [
        `Project: ${projectName}`,
        client ? `Client: ${client}` : null,
        assignedByName ? `Assigned by: ${assignedByName}` : null,
        `Opportunity ID: ${opportunityUid}`,
        '',
        'This task was auto-created by CMRP OppX.',
        'It will be marked complete when the proposal is submitted.'
      ].filter(Boolean).join('\n');

      // Build request body with optional due date
      const requestBody = {
        title: taskTitle,
        notes: taskNotes,
        status: 'needsAction'
      };

      // Google Tasks API expects due date in RFC 3339 format
      // Default to today if no date — tasks without a date won't appear on Google Calendar
      const effectiveDate = dueDate || new Date().toISOString().split('T')[0];
      try {
        const d = new Date(effectiveDate);
        if (!isNaN(d.getTime())) {
          requestBody.due = d.toISOString();
          console.log(`[GOOGLE-TASKS] Setting due date: ${requestBody.due}${!dueDate ? ' (defaulted to today)' : ''}`);
        }
      } catch (e) {
        console.warn(`[GOOGLE-TASKS] Invalid due date "${effectiveDate}":`, e.message);
      }

      const task = await tasksClient.tasks.insert({
        tasklist: '@default',
        requestBody
      });

      const googleTaskId = task.data.id;
      console.log(`[GOOGLE-TASKS] Created Google Task: ${googleTaskId}`);

      // Store mapping in database (upsert)
      await db.query(
        `INSERT INTO google_tasks_mapping (user_id, opportunity_uid, google_task_id, task_list_id, task_title, status)
         VALUES (?, ?, ?, '@default', ?, 'needsAction')
         ON CONFLICT (user_id, opportunity_uid) DO UPDATE SET
           google_task_id = EXCLUDED.google_task_id,
           task_title = EXCLUDED.task_title,
           status = 'needsAction',
           completed_at = NULL,
           updated_at = datetime('now')`,
        [userId, opportunityUid, googleTaskId, taskTitle]
      );

      return { success: true, googleTaskId };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Failed to create task:`, error.message);
      // Don't throw - task creation failure shouldn't block PIC assignment
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a Google Task as completed when proposal is submitted
   */
  async completeTaskForOpportunity(opportunityUid) {
    try {
      console.log(`[GOOGLE-TASKS] Completing tasks for opportunity: ${opportunityUid}`);

      // Find all task mappings for this opportunity
      const mappings = await db.query(
        `SELECT * FROM google_tasks_mapping WHERE opportunity_uid = ? AND status = 'needsAction'`,
        [opportunityUid]
      );

      if (mappings.rows.length === 0) {
        console.log(`[GOOGLE-TASKS] No active tasks found for opportunity ${opportunityUid}`);
        return { success: true, completed: 0 };
      }

      let completedCount = 0;

      for (const mapping of mappings.rows) {
        try {
          const tasksClient = await this.getTasksClient(mapping.user_id);

          // Mark the Google Task as completed
          await tasksClient.tasks.patch({
            tasklist: mapping.task_list_id || '@default',
            task: mapping.google_task_id,
            requestBody: {
              status: 'completed'
            }
          });

          // Update local mapping
          await db.query(
            `UPDATE google_tasks_mapping
             SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
             WHERE id = ?`,
            [mapping.id]
          );

          completedCount++;
          console.log(`[GOOGLE-TASKS] Completed task ${mapping.google_task_id} for user ${mapping.user_id}`);

        } catch (taskError) {
          console.error(`[GOOGLE-TASKS] Failed to complete task ${mapping.google_task_id}:`, taskError.message);
        }
      }

      return { success: true, completed: completedCount };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Failed to complete tasks:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Google Tasks status for a user
   */
  async getUserTasksStatus(userId) {
    try {
      const userTokens = await this.calendarOAuthService.getUserTokens(userId);

      if (!userTokens) {
        return { connected: false, tasksEnabled: false };
      }

      // Check if the stored scopes include tasks
      const scopes = userTokens.scope || '';
      const hasTasksScope = scopes.includes('tasks');

      return {
        connected: true,
        tasksEnabled: hasTasksScope,
        googleEmail: userTokens.google_email,
        message: hasTasksScope
          ? 'Google Tasks integration is active'
          : 'Please reconnect your Google account to enable Tasks (disconnect and reconnect)'
      };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Failed to get status:`, error.message);
      return { connected: false, tasksEnabled: false, error: error.message };
    }
  }

  /**
   * Sync all current PIC assignments to Google Tasks for a user.
   * Creates tasks for any proposals where the user is PIC but no task exists yet.
   */
  async syncPICAssignmentsToTasks(userId, userName) {
    try {
      console.log(`[GOOGLE-TASKS] Syncing PIC assignments for user: ${userName} (${userId})`);

      // Find all proposals where this user is PIC and status is not Submitted/Awarded/Lost/Declined
      const proposals = await db.query(
        `SELECT uid, project_name, client, status, pic, forecast_date, submitted_date
         FROM opps_monitoring
         WHERE UPPER(pic) = UPPER(?)
           AND status IN ('On-Going', 'For Approval', 'For Revision', 'Not Yet Started', 'No Decision Yet')
         ORDER BY project_name`,
        [userName]
      );

      if (proposals.rows.length === 0) {
        console.log(`[GOOGLE-TASKS] No active PIC assignments found for ${userName}`);
        return { success: true, created: 0, skipped: 0, total: 0 };
      }

      console.log(`[GOOGLE-TASKS] Found ${proposals.rows.length} active PIC assignments`);

      let created = 0;
      let skipped = 0;

      for (const proposal of proposals.rows) {
        const result = await this.createTaskForPICAssignment({
          userId,
          opportunityUid: proposal.uid,
          projectName: proposal.project_name,
          client: proposal.client,
          assignedByName: 'Sync',
          dueDate: proposal.forecast_date || proposal.submitted_date || null
        });

        if (result.existing) {
          skipped++;
        } else if (result.success) {
          created++;
        }
      }

      console.log(`[GOOGLE-TASKS] Sync complete: ${created} created, ${skipped} skipped`);
      return { success: true, created, skipped, total: proposals.rows.length };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Sync failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * List pending Google Tasks for a user (from local mapping)
   */
  async getUserPendingTasks(userId) {
    try {
      const result = await db.query(
        `SELECT gtm.*, o.project_name, o.client, o.status as opp_status, o.pic
         FROM google_tasks_mapping gtm
         LEFT JOIN opps_monitoring o ON gtm.opportunity_uid = o.uid
         WHERE gtm.user_id = ? AND gtm.status = 'needsAction'
         ORDER BY gtm.created_at DESC`,
        [userId]
      );

      return { success: true, tasks: result.rows };

    } catch (error) {
      console.error(`[GOOGLE-TASKS] Failed to get pending tasks:`, error.message);
      return { success: false, tasks: [], error: error.message };
    }
  }

  /**
   * Send weekly digest email with proposals submitted in the past week.
   * Sends to all users who have connected their Google account.
   * Uses the first available admin's tokens to send.
   */
  async sendWeeklyDigest() {
    try {
      console.log(`[WEEKLY-DIGEST] === Starting weekly digest ===`);

      // 1. Query proposals submitted in the past 7 days
      const proposals = await db.query(
        `SELECT project_name, project_code, client, account_mgr, pic, bom, final_amt, margin, submitted_date, google_drive_folder_url, opp_status
         FROM opps_monitoring
         WHERE submitted_date >= date('now', '-7 days')
           AND status = 'Submitted'
         ORDER BY
           CAST(REPLACE(opp_status, 'OP', '') AS INTEGER) DESC,
           CAST(REPLACE(REPLACE(REPLACE(final_amt, '₱', ''), '$', ''), ',', '') AS REAL) DESC`
      );

      if (proposals.rows.length === 0) {
        console.log(`[WEEKLY-DIGEST] No proposals submitted this week, skipping email`);
        return { success: true, sent: 0, reason: 'no_submissions' };
      }

      console.log(`[WEEKLY-DIGEST] Found ${proposals.rows.length} submitted proposals`);

      // 2. Get all users with Google OAuth connected
      const recipients = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.account_type, uct.google_email
         FROM users u
         INNER JOIN user_calendar_tokens uct ON u.id = uct.user_id
         WHERE uct.google_email IS NOT NULL
           AND (u.account_type IN ('Admin', 'System Admin')
                OR u.name IN (SELECT DISTINCT account_mgr FROM opps_monitoring WHERE account_mgr IS NOT NULL))
         ORDER BY u.name ASC`
      );

      if (recipients.rows.length === 0) {
        console.log(`[WEEKLY-DIGEST] No users with Google accounts connected, skipping`);
        return { success: true, sent: 0, reason: 'no_recipients' };
      }

      // 3. Find a sender (prefer Admin, fall back to any connected user)
      let senderUserId = null;
      for (const r of recipients.rows) {
        if (r.account_type === 'Admin' || r.account_type === 'System Admin') {
          senderUserId = r.id;
          break;
        }
      }
      if (!senderUserId) senderUserId = recipients.rows[0].id;

      let senderTokens;
      try {
        senderTokens = await this.calendarOAuthService.ensureValidTokens(senderUserId);
      } catch (e) {
        console.error(`[WEEKLY-DIGEST] Failed to get sender tokens:`, e.message);
        return { success: false, error: 'No valid sender tokens available' };
      }

      // 4. Build email body
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      const subject = `[CMRP OppX] Weekly Submissions Report - ${formatDate(now)}`;

      // Calculate total amount
      let totalAmt = 0;
      for (const p of proposals.rows) {
        const amt = parseFloat(String(p.final_amt || '0').replace(/[₱$,]/g, ''));
        if (!isNaN(amt)) totalAmt += amt;
      }

      const formatCurrency = (amt) => {
        return '₱' + amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      // Build table rows
      const tableRows = proposals.rows.map((p, i) => {
        const amt = parseFloat(String(p.final_amt || '0').replace(/[₱$,]/g, ''));
        return [
          `${i + 1}. ${p.project_name || 'N/A'}`,
          `   Project No.: ${p.project_code || 'N/A'}`,
          `   Client:      ${p.client || 'N/A'}`,
          `   AM:          ${p.account_mgr || 'N/A'}`,
          `   PIC:         ${p.pic || 'N/A'}`,
          `   BOM:         ${p.bom || 'N/A'}`,
          `   Amount:      ${!isNaN(amt) && amt > 0 ? formatCurrency(amt) : 'N/A'}`,
          `   Margin:      ${p.margin ? p.margin + '%' : 'N/A'}`,
          `   Submitted:   ${p.submitted_date || 'N/A'}`,
          p.google_drive_folder_url ? `   Google Drive: ${p.google_drive_folder_url}` : null
        ].filter(Boolean).join('\n');
      }).join('\n\n');

      const body = [
        `Weekly Submissions Report`,
        `${formatDate(weekStart)} - ${formatDate(now)}`,
        ``,
        `Total Proposals Submitted: ${proposals.rows.length}`,
        `Total Amount: ${formatCurrency(totalAmt)}`,
        ``,
        `${'='.repeat(50)}`,
        ``,
        tableRows,
        ``,
        `${'='.repeat(50)}`,
        ``,
        `— CMRP OppX`,
        ``,
        `This is a computer-generated email. Please do not reply.`
      ].join('\n');

      // 5. Send to all recipients
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
      );
      oauth2Client.setCredentials({
        access_token: senderTokens.access_token,
        refresh_token: senderTokens.refresh_token
      });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      let sentCount = 0;
      const recipientEmails = recipients.rows.map(r => r.google_email);

      // Send one email with all recipients in To
      const rawMessage = [
        `To: ${recipientEmails.join(', ')}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        body
      ].join('\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      sentCount = recipientEmails.length;
      console.log(`[WEEKLY-DIGEST] Email sent to ${sentCount} recipients: ${recipientEmails.join(', ')}`);

      return { success: true, sent: sentCount, proposals: proposals.rows.length, recipients: recipientEmails };

    } catch (error) {
      console.error(`[WEEKLY-DIGEST] Failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send email notification when a project is awarded (OP100).
   * Sends to account managers and admins.
   */
  async sendOP100Email({ projectCode, projectName, client, accountMgr, pic, bom, finalAmt, margin, driveFolderUrl, changedByName }) {
    try {
      console.log(`[OP100-EMAIL] Sending OP100 notification for: ${projectName}`);

      // Get recipients: account managers + admins with Google connected
      const recipients = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.account_type, uct.google_email
         FROM users u
         INNER JOIN user_calendar_tokens uct ON u.id = uct.user_id
         WHERE uct.google_email IS NOT NULL
           AND (u.account_type IN ('Admin', 'System Admin')
                OR u.name IN (SELECT DISTINCT account_mgr FROM opps_monitoring WHERE account_mgr IS NOT NULL))
         ORDER BY u.name ASC`
      );

      if (recipients.rows.length === 0) {
        console.log(`[OP100-EMAIL] No recipients found, skipping`);
        return { success: false, reason: 'no_recipients' };
      }

      // Find sender (prefer Admin)
      let senderUserId = null;
      for (const r of recipients.rows) {
        if (r.account_type === 'Admin' || r.account_type === 'System Admin') {
          senderUserId = r.id;
          break;
        }
      }
      if (!senderUserId) senderUserId = recipients.rows[0].id;

      let senderTokens;
      try {
        senderTokens = await this.calendarOAuthService.ensureValidTokens(senderUserId);
      } catch (e) {
        console.error(`[OP100-EMAIL] Failed to get sender tokens:`, e.message);
        return { success: false, error: 'No valid sender tokens' };
      }

      const amt = parseFloat(String(finalAmt || '0').replace(/[₱$,]/g, ''));
      const formatCurrency = (v) => '₱' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const subject = `[CMRP OppX] 🎉 Project Awarded (OP100): ${projectName}`;
      const body = [
        `A project has been awarded (OP100)!`,
        ``,
        projectCode ? `  Project No.: ${projectCode}` : null,
        `  Project:     ${projectName}`,
        `  Client:      ${client || 'N/A'}`,
        `  AM:          ${accountMgr || 'N/A'}`,
        `  PIC:         ${pic || 'N/A'}`,
        `  BOM:         ${bom || 'N/A'}`,
        `  Amount:      ${!isNaN(amt) && amt > 0 ? formatCurrency(amt) : 'N/A'}`,
        margin ? `  Margin:      ${margin}%` : null,
        driveFolderUrl ? `  Google Drive: ${driveFolderUrl}` : null,
        ``,
        `  Updated by:  ${changedByName}`,
        ``,
        `Congratulations to the team!`,
        ``,
        `— CMRP OppX`,
        ``,
        `This is a computer-generated email. Please do not reply.`
      ].filter(Boolean).join('\n');

      const recipientEmails = recipients.rows.map(r => r.google_email);

      const rawMessage = [
        `To: ${recipientEmails.join(', ')}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        body
      ].join('\n');

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
      );
      oauth2Client.setCredentials({
        access_token: senderTokens.access_token,
        refresh_token: senderTokens.refresh_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage }
      });

      console.log(`[OP100-EMAIL] Sent to ${recipientEmails.length} recipients: ${recipientEmails.join(', ')}`);
      return { success: true, sent: recipientEmails.length };

    } catch (error) {
      console.error(`[OP100-EMAIL] Failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = GoogleTasksService;
