require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.from('training_session_exceptions').insert({
        training_type_id: "0263e020-7246-4f72-9fbc-64b91412db66",
        session_start_time: "2026-04-14T07:40:00.000Z",
        is_individual: true
    });
    if (error) console.error(error);
    else console.log("Success");
}

main();
