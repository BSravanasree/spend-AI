/**
 * Create Super Admin Script
 * Run this after signing up to make yourself a super admin
 * 
 * Usage: node scripts/createSuperAdmin.js your-email@example.com
 */

require('dotenv').config();
const { supabaseAdmin } = require('../src/config/supabase');

async function createSuperAdmin(email) {
    try {
        console.log(`\n🔧 Creating super admin for: ${email}\n`);

        // Update user role to super_admin
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ role: 'super_admin' })
            .eq('email', email)
            .select();

        if (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }

        if (!data || data.length === 0) {
            console.error(`❌ No user found with email: ${email}`);
            console.log('\n💡 Make sure you have signed up first!\n');
            process.exit(1);
        }

        console.log('✅ Success! User is now a super admin:');
        console.log(JSON.stringify(data[0], null, 2));
        console.log('\n🎉 You can now access admin routes!\n');
        console.log('Try: GET /api/admin/dashboard\n');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        process.exit(1);
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('\n❌ Please provide an email address\n');
    console.log('Usage: node scripts/createSuperAdmin.js your-email@example.com\n');
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
    console.error('\n❌ Invalid email format\n');
    process.exit(1);
}

createSuperAdmin(email);
