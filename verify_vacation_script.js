const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function verify() {
    console.log('Starting verification...');

    // Load Env Vars
    let envContent;
    try {
        envContent = fs.readFileSync('.env.local', 'utf8');
    } catch (e) {
        console.error('Could not read .env.local');
        return;
    }

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const anonKeyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    const serviceRoleKeyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

    if (!urlMatch || !serviceRoleKeyMatch) {
        console.error('Keys not found in .env.local');
        return;
    }

    const supabaseUrl = urlMatch[1].trim();
    const serviceRoleKey = serviceRoleKeyMatch[1].trim();
    const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : null;

    // Use Service Role to Create (Admin Action)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Use Anon Key to Read (User Action)
    const supabasePublic = anonKey ? createClient(supabaseUrl, anonKey) : null;

    // 1. Create a vacation for tomorrow, 10:00 - 12:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(10, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(12, 0, 0, 0);

    // Ensure ISO strings are correct
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    console.log(`[TEST] Creating vacation: ${startIso} to ${endIso}`);

    const { data: vacation, error: insertError } = await supabaseAdmin
        .from('vacations')
        .insert({
            start_time: startIso,
            end_time: endIso,
            description: 'Verification Vacation'
        })
        .select()
        .single();

    if (insertError) {
        console.error('[FAIL] Insert failed:', insertError);
        return;
    }

    console.log('[PASS] Vacation created:', vacation);

    // 2. Fetch vacations (public read)
    if (supabasePublic) {
        console.log('[TEST] Checking public read access...');
        // We select strictly by ID to confirm visibility
        const { data: fetched, error: fetchError } = await supabasePublic
            .from('vacations')
            .select('*')
            .eq('id', vacation.id);

        if (fetchError) {
            console.error('[FAIL] Public Fetch failed:', fetchError);
        } else {
            if (fetched && fetched.length === 1) {
                console.log('[PASS] Public read works. Vacation is visible.');
            } else {
                console.error('[FAIL] Public read returned no data.');
            }
        }
    } else {
        console.warn('[WARN] No anon key found, skipping public read test.');
    }

    // 3. Clean up
    console.log('[TEST] Cleaning up...');
    const { error: deleteError } = await supabaseAdmin
        .from('vacations')
        .delete()
        .eq('id', vacation.id);

    if (deleteError) {
        console.error('[FAIL] Cleanup failed:', deleteError);
    } else {
        console.log('[PASS] Cleanup successful.');
    }
}

verify();
