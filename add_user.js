#!/usr/bin/env node
/**
 * Add a new user or update password.
 * Usage: node add_user.js <email> <password> [name]
 *        node add_user.js <email> <password> --update-password   (reset password if user exists)
 * Example: node add_user.js aeron.sanpascual@cmrpautomation.com cmrp0601 "Aeron San Pascual"
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db_adapter');

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--update-password');
  const updatePassword = process.argv.includes('--update-password');
  const email = args[0] || 'aeron.sanpascual@cmrpautomation.com';
  const password = args[1] || 'cmrp0601';
  const name = args[2] || email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in .env');
    process.exit(1);
  }

  try {
    if (!db.getDBType()) await db.initDatabase();

    const check = await db.query('SELECT id, name FROM users WHERE email = ?', [email]);

    if (check.rows && check.rows.length > 0) {
      if (updatePassword) {
        const password_hash = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password_hash = ? WHERE email = ?', [password_hash, email]);
        console.log('Password updated for:', email);
      } else {
        console.error('User already exists:', email);
        console.error('Use --update-password to reset password: node add_user.js', email, '<new_password>', '--update-password');
        process.exit(1);
      }
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const roles = JSON.stringify(['DS', 'SE']);
    const accountType = 'User';

    await db.query(
      'INSERT INTO users (id, email, password_hash, name, is_verified, roles, account_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email, password_hash, name, 1, roles, accountType]
    );

    console.log('User added successfully:');
    console.log('  Email:', email);
    console.log('  Name:', name);
    console.log('  ID:', id);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    if (typeof db.close === 'function') await db.close().catch(() => {});
  }
}

main();
