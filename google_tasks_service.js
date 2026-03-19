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
  async sendAssignmentEmail({ assignedUserId, assignedByUserId, projectCode, projectName, client, assignedByName, opportunityUid, driveFolderUrl, role = 'PIC' }) {
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

      const subject = `[CMRP OppX] New ${role} Assignment: ${projectName}`;
      const body = [
        `Hi,`,
        ``,
        `You have been assigned as ${role} for the following project:`,
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
      assignedUserId: userId, assignedByUserId, projectCode, projectName, client, assignedByName, opportunityUid, driveFolderUrl, role: 'PIC'
    });

    return results;
  }

  /**
   * Send email when BOM is assigned (no Google Task, just email).
   */
  async onBOMAssigned({ userId, assignedByUserId, projectCode, projectName, client, assignedByName, driveFolderUrl, opportunityUid }) {
    return await this.sendAssignmentEmail({
      assignedUserId: userId, assignedByUserId, projectCode, projectName, client, assignedByName, opportunityUid, driveFolderUrl, role: 'BOM'
    });
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
  async sendWeeklyDigest(selectedRecipients = null) {
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
      const allConnectedUsers = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.account_type, uct.google_email
         FROM users u
         INNER JOIN user_calendar_tokens uct ON u.id = uct.user_id
         WHERE uct.google_email IS NOT NULL
           AND (u.account_type IN ('Admin', 'System Admin')
                OR u.name IN (SELECT DISTINCT account_mgr FROM opps_monitoring WHERE account_mgr IS NOT NULL))
         ORDER BY u.name ASC`
      );

      if (allConnectedUsers.rows.length === 0) {
        console.log(`[WEEKLY-DIGEST] No users with Google accounts connected, skipping`);
        return { success: true, sent: 0, reason: 'no_recipients' };
      }

      // If selectedRecipients provided, filter to only those emails
      let recipients;
      if (selectedRecipients && selectedRecipients.length > 0) {
        recipients = allConnectedUsers.rows.filter(r => selectedRecipients.includes(r.google_email));
        if (recipients.length === 0) {
          console.log(`[WEEKLY-DIGEST] None of the selected recipients have Google accounts connected`);
          return { success: true, sent: 0, reason: 'no_matching_recipients' };
        }
        console.log(`[WEEKLY-DIGEST] Manual send to ${recipients.length} selected recipients`);
      } else {
        recipients = allConnectedUsers.rows;
      }

      // 3. Find a sender (prefer Admin, fall back to any connected user)
      let senderUserId = null;
      for (const r of allConnectedUsers.rows) {
        if (r.account_type === 'Admin' || r.account_type === 'System Admin') {
          senderUserId = r.id;
          break;
        }
      }
      if (!senderUserId) senderUserId = allConnectedUsers.rows[0].id;

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
      const recipientEmails = recipients.map(r => r.google_email);

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

  static OP100_REQUIRED_RECIPIENTS = [
    'tyronejames.caballero@cmrpautomation.com',
    'rojel.rivera@cmrpautomation.com',
    'procurement@cmrpautomation.com',
    'jayson.bornales@cmrpautomation.com',
    'dianne.rael@cmrpautomation.com',
    'marjori.cortez@cmrpautomation.com',
    'logistics@cmrpautomation.com',
  ];

  // Conditional recipients based on Account Manager
  static OP100_AM_RECIPIENTS = {
    'JMO': ['jun@cmr.ph', 'Jun.ortiz@cmrpautomation.com'],
    'CBD': ['crisostomo.diaz@cmrpautomation.com'],
  };

  /**
   * Send email notification when a project is awarded (OP100).
   * Always sends to the hardcoded OP100_REQUIRED_RECIPIENTS list,
   * plus any additional admins/account managers with Google connected.
   */
  async sendOP100Email({ projectCode, projectName, client, accountMgr, pic, bom, finalAmt, margin, driveFolderUrl, changedByName, poNumber, poDate, budgetProducts, budgetServices, budgetGenReq }) {
    try {
      if (global.op100MaintenanceMode) {
        console.log('[OP100-EMAIL] Skipped (runtime maintenance mode ON)');
        return { success: false, reason: 'maintenance_mode' };
      }

      console.log(`[OP100-EMAIL] Sending OP100 notification for: ${projectName}`);

      // Find a sender with valid Google OAuth tokens (prefer Admin)
      const tokenUsers = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email, u.account_type, uct.google_email
         FROM users u
         INNER JOIN user_calendar_tokens uct ON u.id = uct.user_id
         WHERE uct.google_email IS NOT NULL
           AND (u.account_type IN ('Admin', 'System Admin')
                OR u.name IN (SELECT DISTINCT account_mgr FROM opps_monitoring WHERE account_mgr IS NOT NULL))
         ORDER BY u.name ASC`
      );

      let senderUserId = null;
      for (const r of tokenUsers.rows) {
        if (r.account_type === 'Admin' || r.account_type === 'System Admin') {
          senderUserId = r.id;
          break;
        }
      }
      if (!senderUserId && tokenUsers.rows.length > 0) senderUserId = tokenUsers.rows[0].id;

      if (!senderUserId) {
        console.log(`[OP100-EMAIL] No user with Google tokens found to act as sender, skipping`);
        return { success: false, reason: 'no_sender' };
      }

      let senderTokens;
      try {
        senderTokens = await this.calendarOAuthService.ensureValidTokens(senderUserId);
      } catch (e) {
        console.error(`[OP100-EMAIL] Failed to get sender tokens:`, e.message);
        return { success: false, error: 'No valid sender tokens' };
      }

      // Build de-duped recipient list: required list + AM-conditional + env + DB emails
      const amConditional = GoogleTasksService.OP100_AM_RECIPIENTS[accountMgr] || [];
      const extraEnv = (process.env.OP100_NOTIFICATION_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      const dbEmails = tokenUsers.rows.map(r => r.google_email).filter(Boolean);
      const allEmails = [...GoogleTasksService.OP100_REQUIRED_RECIPIENTS, ...amConditional, ...extraEnv, ...dbEmails];
      const recipientEmails = [...new Set(allEmails.map(e => e.toLowerCase()))];

      const amt = parseFloat(String(finalAmt || '0').replace(/[₱$,]/g, ''));
      const formatCurrency = (v) => '₱' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const subjectParts = ['[CMRP OppX] Project Awarded :', projectCode || '', projectName];
      const subject = subjectParts.filter(Boolean).join(' ').trim();
      // Format budget amounts
      const parseBudget = (v) => { const n = parseFloat(String(v || '0').replace(/[₱$,]/g, '')); return !isNaN(n) && n > 0 ? n : null; };
      const bProducts = parseBudget(budgetProducts);
      const bServices = parseBudget(budgetServices);
      const bGenReq = parseBudget(budgetGenReq);
      const hasBudget = bProducts || bServices || bGenReq;

      const body = [
        `A project has been awarded (OP100)!`,
        ``,
        projectCode ? `Project #: ${projectCode}` : null,
        `Project Name: ${projectName}`,
        `AM: ${accountMgr || 'N/A'}`,
        poNumber ? `PO Number: ${poNumber}` : null,
        poDate ? `PO Date: ${poDate}` : null,
        `Amount: ${!isNaN(amt) && amt > 0 ? formatCurrency(amt) : 'N/A'}`,
        margin ? `Margin: ${margin}%` : null,
        hasBudget ? `` : null,
        hasBudget ? `--- Budget Allocation ---` : null,
        bProducts ? `Products: ${formatCurrency(bProducts)}` : null,
        bServices ? `Services: ${formatCurrency(bServices)}` : null,
        bGenReq ? `Gen-Req: ${formatCurrency(bGenReq)}` : null,
        hasBudget ? `-------------------------` : null,
        driveFolderUrl ? `` : null,
        driveFolderUrl ? `Google Drive Link: ${driveFolderUrl}` : null,
        ``,
        `Updated by: ${changedByName}`,
        ``,
        `— CMRP OppX`,
        ``,
        `This is a System-generated email. Please do not reply.`
      ].filter(v => v !== null).join('\n');

      // Look up existing thread for this project
      let existingThreadId = null;
      if (projectCode) {
        try {
          const threadRow = await db.query(
            `SELECT op100_thread_id FROM opps_monitoring WHERE project_code = ? AND op100_thread_id IS NOT NULL LIMIT 1`,
            [projectCode]
          );
          if (threadRow.rows.length > 0 && threadRow.rows[0].op100_thread_id) {
            existingThreadId = threadRow.rows[0].op100_thread_id;
            console.log(`[OP100-EMAIL] Found existing thread ${existingThreadId} for ${projectCode}`);
          }
        } catch (e) {
          console.log(`[OP100-EMAIL] Thread lookup failed: ${e.message}`);
        }
      }

      const rawMessageLines = [
        `To: ${recipientEmails.join(', ')}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
      ];
      // Add References header to keep same thread
      if (existingThreadId) {
        rawMessageLines.push(`References: <op100-${projectCode}@cmrp-oppx>`);
        rawMessageLines.push(`In-Reply-To: <op100-${projectCode}@cmrp-oppx>`);
      } else {
        rawMessageLines.push(`Message-ID: <op100-${projectCode}@cmrp-oppx>`);
      }
      rawMessageLines.push('', body);
      const rawMessage = rawMessageLines.join('\n');

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
      const sendRequest = {
        userId: 'me',
        requestBody: { raw: encodedMessage }
      };
      if (existingThreadId) {
        sendRequest.requestBody.threadId = existingThreadId;
      }
      const sentResult = await gmail.users.messages.send(sendRequest);

      // Store thread ID for future replies on same project
      const sentThreadId = sentResult.data.threadId;
      if (sentThreadId && projectCode && !existingThreadId) {
        try {
          await db.query(
            `UPDATE opps_monitoring SET op100_thread_id = ? WHERE project_code = ?`,
            [sentThreadId, projectCode]
          );
          console.log(`[OP100-EMAIL] Stored thread ID ${sentThreadId} for ${projectCode}`);
        } catch (e) {
          console.log(`[OP100-EMAIL] Failed to store thread ID: ${e.message}`);
        }
      }

      console.log(`[OP100-EMAIL] Sent to ${recipientEmails.length} recipients (thread: ${sentThreadId}): ${recipientEmails.join(', ')}`);
      return { success: true, sent: recipientEmails.length, threadId: sentThreadId };

    } catch (error) {
      console.error(`[OP100-EMAIL] Failed:`, error.message);
      return { success: false, error: error.message };
    }
  }
  /**
   * Poll OP100 email threads for budget status requests and auto-reply.
   * Looks for replies containing "Product Budget Status" in OP100 threads,
   * calculates remaining budget from PO List Google Sheet, and replies.
   */
  async checkOP100BudgetRequests() {
    try {
      // Find a user with valid Gmail tokens (prefer Admin/System Admin)
      const tokenUsers = await db.query(
        `SELECT DISTINCT u.id, u.name, u.account_type, uct.google_email
         FROM users u
         INNER JOIN user_calendar_tokens uct ON u.id = uct.user_id
         WHERE uct.google_email IS NOT NULL
           AND u.account_type IN ('Admin', 'System Admin')
         ORDER BY u.name ASC`
      );

      if (tokenUsers.rows.length === 0) {
        console.log('[BUDGET-STATUS] No admin with Google tokens found');
        return { success: false, reason: 'no_admin_tokens' };
      }

      const adminUser = tokenUsers.rows[0];
      let tokens;
      try {
        tokens = await this.calendarOAuthService.ensureValidTokens(adminUser.id);
      } catch (e) {
        console.log(`[BUDGET-STATUS] Failed to get tokens for ${adminUser.name}: ${e.message}`);
        return { success: false, reason: 'token_error' };
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/google/calendar/callback'
      );
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Search for unread replies in OP100 threads containing budget keywords
      const searchRes = await gmail.users.messages.list({
        userId: 'me',
        q: 'subject:"[CMRP OppX] Project Awarded" is:unread "Product Budget Status"',
        maxResults: 10
      });

      const messages = searchRes.data.messages || [];
      if (messages.length === 0) {
        return { success: true, processed: 0 };
      }

      console.log(`[BUDGET-STATUS] Found ${messages.length} unread budget status request(s)`);
      let processed = 0;

      for (const msg of messages) {
        try {
          const fullMsg = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full'
          });

          const headers = fullMsg.data.payload.headers || [];
          const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
          const threadId = fullMsg.data.threadId;

          // Verify body contains "product budget status" (case-insensitive)
          const bodyData = this._extractMessageBody(fullMsg.data.payload);
          if (!bodyData || !bodyData.toLowerCase().includes('product budget status')) {
            await this._markAsRead(gmail, msg.id);
            continue;
          }

          // Extract project code from subject: "[CMRP OppX] Project Awarded : CMRP26010027 ProjectName"
          const projMatch = subject.match(/Project Awarded\s*:\s*(CMRP\d+)/i);
          if (!projMatch) {
            console.log(`[BUDGET-STATUS] Could not extract project code from: ${subject}`);
            await this._markAsRead(gmail, msg.id);
            continue;
          }

          const projectCode = projMatch[1];
          console.log(`[BUDGET-STATUS] Processing budget request for ${projectCode}`);

          // Get products budget from DB
          const oppRow = await db.query(
            `SELECT project_name, account_mgr, budget_products, budget_services, budget_gen_req, op100_thread_id
             FROM opps_monitoring WHERE project_code = ? LIMIT 1`,
            [projectCode]
          );

          if (oppRow.rows.length === 0) {
            console.log(`[BUDGET-STATUS] Project ${projectCode} not found in DB`);
            await this._markAsRead(gmail, msg.id);
            continue;
          }

          const opp = oppRow.rows[0];
          const budgetProducts = parseFloat(opp.budget_products) || 0;

          // Query PO List Google Sheet for total products expense
          const poExpense = await this._getProductsExpenseFromSheet(projectCode);

          const remaining = budgetProducts - poExpense;
          const formatCurrency = (v) => '₱' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          const replyBody = [
            `Product Budget Status for ${projectCode} (${opp.project_name || 'N/A'})`,
            ``,
            `--- Product Budget Summary ---`,
            `Products Budget:    ${budgetProducts > 0 ? formatCurrency(budgetProducts) : 'N/A'}`,
            `Total PO Expense:   ${formatCurrency(poExpense)}`,
            `Remaining Budget:   ${remaining >= 0 ? formatCurrency(remaining) : '-' + formatCurrency(remaining) + ' (OVER BUDGET)'}`,
            `-----------------------------`,
            ``,
            `— CMRP OppX`,
            ``,
            `This is a System-generated email. Please do not reply.`
          ].join('\n');

          // Build reply-all recipient list: all OP100 recipients + AM-conditional
          const replyAM = opp.account_mgr || '';
          const amConditional = GoogleTasksService.OP100_AM_RECIPIENTS[replyAM] || [];
          const allReplyRecipients = [...GoogleTasksService.OP100_REQUIRED_RECIPIENTS, ...amConditional];
          // Add the person who requested (in case they're not in the list)
          const requesterEmail = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
          if (requesterEmail) allReplyRecipients.push(requesterEmail);
          const replyTo = [...new Set(allReplyRecipients.map(e => e.toLowerCase()))].join(', ');

          const replyHeaders = [
            `To: ${replyTo}`,
            `Subject: Re: ${subject.replace(/^Re:\s*/i, '')}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `In-Reply-To: ${headers.find(h => h.name.toLowerCase() === 'message-id')?.value || ''}`,
            `References: ${headers.find(h => h.name.toLowerCase() === 'message-id')?.value || ''}`,
            ``,
            replyBody
          ].join('\n');

          const encodedReply = Buffer.from(replyHeaders)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

          await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
              raw: encodedReply,
              threadId: threadId
            }
          });

          // Mark original request as read
          await this._markAsRead(gmail, msg.id);

          console.log(`[BUDGET-STATUS] Replied to budget request for ${projectCode} (budget: ${formatCurrency(budgetProducts)}, expense: ${formatCurrency(poExpense)}, remaining: ${formatCurrency(remaining)})`);
          processed++;

        } catch (msgErr) {
          console.error(`[BUDGET-STATUS] Error processing message ${msg.id}:`, msgErr.message);
        }
      }

      return { success: true, processed };

    } catch (error) {
      console.error(`[BUDGET-STATUS] Poll failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract plain text body from Gmail message payload.
   */
  _extractMessageBody(payload) {
    if (payload.body && payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        if (part.parts) {
          const nested = this._extractMessageBody(part);
          if (nested) return nested;
        }
      }
    }
    return null;
  }

  /**
   * Mark a Gmail message as read by removing UNREAD label.
   */
  async _markAsRead(gmail, messageId) {
    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] }
      });
    } catch (e) {
      console.log(`[BUDGET-STATUS] Failed to mark ${messageId} as read: ${e.message}`);
    }
  }

  /**
   * Query the PO List Google Sheet for total PRODUCTS expense for a project.
   * Columns: D=PO Number, F=Project Number, J=Amount, K=PO-Classification
   */
  async _getProductsExpenseFromSheet(projectCode) {
    try {
      const spreadsheetId = process.env.PO_LIST_SPREADSHEET_ID;
      if (!spreadsheetId) {
        console.log('[BUDGET-STATUS] PO_LIST_SPREADSHEET_ID not configured');
        return 0;
      }

      // Use service account for Sheets API
      const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      let key;
      try { key = JSON.parse(keyRaw); } catch (_) {
        try { key = JSON.parse(Buffer.from(keyRaw, 'base64').toString()); } catch (_2) {
          const fixed = keyRaw.replace(/\\n/g, '\n');
          key = JSON.parse(fixed);
        }
      }

      const auth = new google.auth.GoogleAuth({
        credentials: key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
      });

      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'PO List!A1:Z5000',
      });

      const rows = res.data.values || [];
      if (rows.length < 2) return 0;

      // Header row to find column indices
      const header = rows[0].map(h => (h || '').toLowerCase().trim());
      const projNumIdx = header.findIndex(h => h.includes('project number'));
      const amountIdx = header.findIndex(h => h.includes('amount'));
      const classIdx = header.findIndex(h => h.includes('classification'));

      if (projNumIdx === -1 || amountIdx === -1 || classIdx === -1) {
        console.log(`[BUDGET-STATUS] Could not find required columns in PO List. Headers: ${header.join(', ')}`);
        return 0;
      }

      let total = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const projNum = (row[projNumIdx] || '').trim();
        const classification = (row[classIdx] || '').trim().toUpperCase();
        const amountStr = (row[amountIdx] || '').toString().replace(/[₱$,\s]/g, '');

        if (projNum === projectCode && classification === 'PRODUCTS') {
          const amt = parseFloat(amountStr);
          if (!isNaN(amt) && amt > 0) {
            total += amt;
          }
        }
      }

      console.log(`[BUDGET-STATUS] PO List total PRODUCTS for ${projectCode}: ₱${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      return total;

    } catch (error) {
      console.error(`[BUDGET-STATUS] Sheet query failed:`, error.message);
      return 0;
    }
  }
}

module.exports = GoogleTasksService;
