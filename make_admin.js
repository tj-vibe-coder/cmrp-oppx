#!/usr/bin/env node
/**
 * Set a user as System Admin (superadmin).
 * Usage: node make_admin.js <email>
 */

require('dotenv').config();
const db = require('./db_adapter');

async function main() {
  const email = process.argv[2] || 'tyronejames.caballero@cmrpautomation.com';
  const roles = JSON.stringify(['Admin', 'DS', 'SE', 'AM', 'TM', 'Office Admin']);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
  }

  try {
    if (!db.getDBType()) await db.initDatabase();

    const result = await db.query(
      'UPDATE users SET account_type = ?, roles = ? WHERE email = ?',
      ['System Admin', roles, email]
    );

    if (result.rowCount === 0) {
      console.error('No user found with email:', email);
      process.exit(1);
    }

    console.log('Updated to System Admin:', email);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (typeof db.close === 'function') await db.close().catch(() => {});
  }
}

main();
