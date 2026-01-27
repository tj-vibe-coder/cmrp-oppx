/**
 * Diagnostic script to identify login credential issues
 * Run with: node diagnose_login_issue.js <email>
 */

require('dotenv').config();
const db = require('./db_adapter');
const bcrypt = require('bcryptjs');

async function diagnoseLoginIssue(email) {
    if (!email) {
        console.error('❌ Please provide an email address');
        console.log('Usage: node diagnose_login_issue.js <email>');
        process.exit(1);
    }

    console.log('🔍 Diagnosing login issue for:', email);
    console.log('=====================================\n');

    try {
        // Initialize database
        console.log('1. Initializing database connection...');
        await db.initDatabase();
        const dbType = db.getDBType();
        console.log(`   ✅ Connected to ${dbType || 'database'}\n`);

        // Check if user exists
        console.log('2. Checking if user exists...');
        const result = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            console.log('   ❌ USER NOT FOUND in database');
            console.log('   📝 Solution: User needs to be created or email is incorrect\n');
            
            // Show similar emails
            const similarResult = await db.query(
                'SELECT email FROM users WHERE email LIKE ? LIMIT 5',
                [`%${email.toLowerCase().split('@')[0]}%`]
            );
            if (similarResult.rows.length > 0) {
                console.log('   💡 Similar emails found:');
                similarResult.rows.forEach(row => {
                    console.log(`      - ${row.email}`);
                });
            }
            return;
        }

        const user = result.rows[0];
        console.log(`   ✅ User found: ${user.name || 'No name'} (ID: ${user.id})`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🔐 Has password_hash: ${user.password_hash ? 'Yes' : 'NO - THIS IS THE PROBLEM!'}`);
        
        if (!user.password_hash) {
            console.log('\n   ❌ ISSUE IDENTIFIED: password_hash is NULL or empty');
            console.log('   📝 Solution: User needs to reset their password\n');
            return;
        }

        // Check password hash format
        console.log('\n3. Checking password hash format...');
        const hashLength = user.password_hash.length;
        const hashPrefix = user.password_hash.substring(0, 7);
        console.log(`   Hash length: ${hashLength} characters`);
        console.log(`   Hash prefix: ${hashPrefix}`);
        
        if (!user.password_hash.startsWith('$2')) {
            console.log('   ⚠️  WARNING: Password hash does not appear to be a bcrypt hash');
            console.log('   📝 Solution: Password needs to be rehashed\n');
        } else {
            console.log('   ✅ Password hash format looks correct (bcrypt)\n');
        }

        // Test password comparison (if password provided)
        const testPassword = process.argv[3];
        if (testPassword) {
            console.log('4. Testing password comparison...');
            try {
                const isValid = await bcrypt.compare(testPassword, user.password_hash);
                if (isValid) {
                    console.log('   ✅ Password matches!');
                } else {
                    console.log('   ❌ Password does NOT match');
                    console.log('   📝 Solution: Use the correct password or reset it\n');
                }
            } catch (error) {
                console.log(`   ❌ Error comparing password: ${error.message}`);
                console.log('   📝 This might indicate a corrupted password hash\n');
            }
        } else {
            console.log('4. Skipping password test (no password provided)');
            console.log('   💡 To test password: node diagnose_login_issue.js <email> <password>\n');
        }

        // Check other user properties
        console.log('5. User account status:');
        console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);
        console.log(`   Roles: ${JSON.stringify(user.roles || [])}`);
        console.log(`   Account Type: ${user.account_type || 'Not set'}`);
        console.log(`   Last Login: ${user.last_login_at || 'Never'}\n');

        // Summary
        console.log('=====================================');
        console.log('📋 SUMMARY:');
        if (!user.password_hash) {
            console.log('   ❌ CRITICAL: password_hash is missing');
            console.log('   🔧 FIX: User needs to reset password via admin panel');
        } else if (!user.password_hash.startsWith('$2')) {
            console.log('   ⚠️  WARNING: password_hash format is invalid');
            console.log('   🔧 FIX: User needs to reset password');
        } else if (testPassword) {
            const isValid = await bcrypt.compare(testPassword, user.password_hash);
            if (!isValid) {
                console.log('   ❌ Password is incorrect');
                console.log('   🔧 FIX: Use correct password or reset it');
            } else {
                console.log('   ✅ All checks passed - login should work');
            }
        } else {
            console.log('   ✅ User exists and has valid password hash');
            console.log('   💡 Test with password to verify it matches');
        }

    } catch (error) {
        console.error('\n❌ Error during diagnosis:', error);
        console.error('Stack:', error.stack);
    } finally {
        await db.close();
    }
}

// Run diagnosis
const email = process.argv[2];
diagnoseLoginIssue(email);
