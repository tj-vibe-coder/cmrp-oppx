#!/usr/bin/env node
/**
 * Clear specific account_mgr and pic values from opps_monitoring.
 * Usage: node clear_account_manager_pic.js
 * Values to clear: RJR, ISP, VIB, EIS, MMR, AVR
 */

require('dotenv').config();
const db = require('./db_adapter');

const TO_REMOVE = ['RJR', 'ISP', 'VIB', 'EIS', 'MMR', 'AVR'];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
  }

  try {
    if (!db.getDBType()) await db.initDatabase();

    const placeholders = TO_REMOVE.map(() => '?').join(',');
    const params = [...TO_REMOVE];

    const rAccount = await db.query(
      `UPDATE opps_monitoring SET account_mgr = '' WHERE account_mgr IN (${placeholders})`,
      params
    );
    const rPic = await db.query(
      `UPDATE opps_monitoring SET pic = '' WHERE pic IN (${placeholders})`,
      params
    );

    const accountCount = rAccount.rowCount ?? rAccount.changes ?? 0;
    const picCount = rPic.rowCount ?? rPic.changes ?? 0;

    console.log('Cleared account_mgr:', accountCount, 'rows (values: ' + TO_REMOVE.join(', ') + ')');
    console.log('Cleared pic:', picCount, 'rows (values: ' + TO_REMOVE.join(', ') + ')');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (typeof db.close === 'function') await db.close().catch(() => {});
  }
}

main();
