import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function test() {
    // 1. Get an existing user
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError || !users || users.length === 0) {
        console.log('Error getting users or no users found:', usersError);
        return;
    }
    const realUserEmail = users[0].email;
    console.log('Testing with real user email:', realUserEmail);

    // 2. Generate link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: realUserEmail!,
        options: {
            redirectTo: 'https://profil.oasislounge.sk/auth/reset-password',
        }
    });

    console.log(JSON.stringify({ 
        success: !error,
        errorCode: error?.code,
        hasOtp: !!data?.properties?.email_otp
    }, null, 2));
}

test();
