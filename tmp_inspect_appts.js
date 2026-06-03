const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAppointments() {
    const ids = [
        'a436fc29-fc2c-4610-8085-2422e67eaa5a', // 29.4. 08:30
        '79ff09e5-88f8-47c1-aa7b-c3fccc20a383', // 28.4. 13:00
        '6f38d8ac-f71d-4cde-99cb-e255acf2d9cc', // 28.4. 12:00
        'a0f19865-f64b-442f-bf59-ffde63bf3038', // 28.4. 11:00
        '8352062d-c3ad-4c7b-82ea-752e81ecb869'  // 28.4. 10:00
    ];

    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('*')
        .in('id', ids);

    console.log(JSON.stringify(appointments, null, 2));
}

inspectAppointments();
