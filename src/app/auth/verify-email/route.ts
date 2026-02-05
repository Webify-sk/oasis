import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (token) {
        const supabase = await createClient();

        // Find user by token and update
        // Note: token column should be unique index for speed, but for MVP plain select is fine
        const { data: profile, error: findError } = await supabase
            .from('profiles')
            .select('id')
            .eq('verification_token', token)
            .single();

        if (profile) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    email_verified: true,
                    verification_token: null
                })
                .eq('id', profile.id);

            if (!updateError) {
                return redirect('/dashboard?verified=true');
            }
        }
    }

    // Fallback if invalid or error
    return redirect('/dashboard?verified=error');
}
