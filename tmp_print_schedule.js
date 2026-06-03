const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function printSchedule() {
    const { data: trainingTypes } = await supabase.from('training_types').select('id, title, schedule').eq('title', 'Transformer Pilates');
    
    for (const t of trainingTypes) {
        console.log(t.title);
        console.log(JSON.stringify(t.schedule, null, 2));
    }
}

printSchedule();
