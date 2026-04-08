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
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError || !users) {
        console.log('Error listing users:', usersError);
        return;
    }

    const targetEmail = 'artibmx@gmail.com';
    const foundUser = users.find(u => u.email === targetEmail);
    
    console.log(`User ${targetEmail} exists in auth database:`, !!foundUser);
    
    if (foundUser) {
        console.log('User details:', foundUser.id, foundUser.email_confirmed_at ? 'Confirmed' : 'Not Confirmed');
    }
}

test();
