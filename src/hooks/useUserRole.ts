'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

export function useUserRole() {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Try to load from cache first for instant UI
        const cachedRole = localStorage.getItem('user_role');
        if (cachedRole) {
            setRole(cachedRole);
            setLoading(false); // Optimistic success
        }

        const supabase = createClient();

        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Check if our cache is stale or if we need to fetch
                // We fetch anyway to be secure, but UI is already stable from cache
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .maybeSingle();

                if (profile) {
                    const newRole = profile.role || 'user';
                    setRole(newRole);
                    localStorage.setItem('user_role', newRole);
                }
            } else {
                // Logged out
                setRole(null);
                localStorage.removeItem('user_role');
            }
            setLoading(false);
        }

        checkRole();
    }, []);

    return { role, loading };
}
