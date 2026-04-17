const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function deleteUserByEmail(email) {
    console.log(`Attempting to delete user: ${email}`);

    // 1. Get User ID from Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('Error listing users:', listError);
        return;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
        console.log('User not found in Auth.');

        // Check if user exists in public.users table (orphan)
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (dbUser) {
            console.log('Found orphan user in DB. Deleting...');
            await cleanupUserData(dbUser.id);
        } else {
            console.log('User not found in DB either.');
        }
        return;
    }

    console.log(`Found user ${user.id}. Deleting...`);

    // 2. Clean up public tables first (though cascade might handle it, let's be safe)
    await cleanupUserData(user.id);

    // 3. Delete from Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
        console.error('Error deleting user from Auth:', deleteError);
    } else {
        console.log('✅ User deleted successfully from Auth.');
    }
}

async function cleanupUserData(userId) {
    try {
        // Delete from public.users
        const { error: userError } = await supabase.from('users').delete().eq('id', userId);
        if (userError) console.error('Error deleting from users table:', userError.message);
        else console.log('Deleted from users table.');

        // Note: Organizations might need manual deletion if not cascaded, 
        // but typically we want to keep them or delete if no users left.
        // For this script, we'll just delete the user.
    } catch (err) {
        console.error('Cleanup error:', err);
    }
}

const email = process.argv[2];
if (!email) {
    console.log('Usage: node delete_user.js <email>');
    process.exit(1);
}

deleteUserByEmail(email);
