const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const dateStr = new Date().toISOString();
console.log("Using Date:", dateStr);

supabase.from('credit_batches')
    .select('*')
    .eq('user_id', 'd3f10253-4036-4e26-9687-684598a5fbb4')
    .gt('remaining_amount', 0)
    .or(`expires_at.is.null,expires_at.gte.${dateStr}`)
    .then(res => {
        console.log("Batches found:", res.data?.length);
        console.log(res.data);
    });
