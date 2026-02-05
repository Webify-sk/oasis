import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function checkAdmin() {
    const supabase = await createClient();

    // 1. Get User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return false;
    }

    // 2. Get Profile Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'admin';
}

export async function requireAdmin() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }
}

export async function checkEmployeeOrAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role === 'admin' || profile?.role === 'employee';
}

export async function requireEmployeeOrAdmin() {
    const isAllowed = await checkEmployeeOrAdmin();
    if (!isAllowed) {
        throw new Error('Unauthorized: Employee or Admin access required');
    }
}
