const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDesyncs() {
    const { data: profiles } = await supabase.from('profiles').select('id, email, credits');
    const { data: batches } = await supabase.from('credit_batches').select('user_id, remaining_amount').gt('remaining_amount', 0).or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);

    const userBatches = {};
    for (const b of batches) {
        if (!userBatches[b.user_id]) userBatches[b.user_id] = 0;
        userBatches[b.user_id] += Number(b.remaining_amount);
    }

    const updates = [];
    for (const p of profiles) {
        const batchTotal = userBatches[p.id] || 0;
        if (p.credits !== batchTotal) {
            updates.push({
                id: p.id,
                email: p.email,
                old_credits: p.credits,
                new_credits: batchTotal,
                diff: batchTotal - p.credits
            });
        }
    }

    console.log(`Found ${updates.length} users to update.`);
    console.table(updates);

    for (const u of updates) {
        const { error } = await supabase.from('profiles').update({ credits: u.new_credits }).eq('id', u.id);
        if (error) {
            console.error(`Error updating ${u.email}:`, error);
        } else {
            console.log(`Updated ${u.email} from ${u.old_credits} to ${u.new_credits}`);
        }
    }

    console.log("Done.");
}

fixDesyncs();
