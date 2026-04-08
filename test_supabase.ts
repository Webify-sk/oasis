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
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: 'artibmx@gmail.com',
        options: {
            redirectTo: 'https://profil.oasislounge.sk/auth/reset-password',
        }
    });

    console.log(JSON.stringify({ data, error }, null, 2));
}

test();
