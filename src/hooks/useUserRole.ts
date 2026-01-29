'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export function useUserRole() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                console.log('Checking role for user ID:', user.id);
                // Try fetching all fields to debug RLS/Column issues
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching user role FULL OBJECT:', JSON.stringify(error, null, 2));
                    console.error('Error details:', error.message, error.details, error.hint);
                } else if (!profile) {
                    console.warn('No profile found for this user ID (checked * columns).');
                } else {
                    console.log('Profile found:', profile);
                }

                setRole(profile?.role || 'user');
            }
            setLoading(false);
        }

        checkRole();
    }, []);

    return { role, loading };
}
