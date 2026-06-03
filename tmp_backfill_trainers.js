const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillTrainerIds() {
    console.log("Fetching bookings and schedules...");
    const { data: bookings, error: bookingsError } = await supabase.from('bookings').select('id, start_time, training_type_id').is('trainer_id', null);
    
    if (bookingsError || !bookings) {
        console.error("Error fetching bookings:", bookingsError);
        return;
    }
    
    const { data: trainingTypes } = await supabase.from('training_types').select('id, schedule');
    
    const typesMap = {};
    for (const t of trainingTypes) {
        typesMap[t.id] = t;
    }
    
    let updatedCount = 0;
    
    console.log(`Processing ${bookings.length} bookings...`);

    for (const b of bookings) {
        const type = typesMap[b.training_type_id];
        if (!type || !type.schedule) continue;
        
        const dateObj = new Date(b.start_time);
        const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
        const dayName = slovakDays[dateObj.getUTCDay()];
        const timeString = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
        const dateString = b.start_time.split('T')[0];

        const scheduleItem = type.schedule.find((s) => {
            if (s.isRecurring !== false) {
                return s.day === dayName && s.time && s.time.startsWith(timeString);
            } else {
                return s.date === dateString && s.time && s.time.startsWith(timeString);
            }
        });

        if (scheduleItem?.trainer_id) {
            await supabase
                .from('bookings')
                .update({ trainer_id: scheduleItem.trainer_id })
                .eq('id', b.id);
            updatedCount++;
        }
    }
    
    console.log(`Successfully backfilled trainer_id for ${updatedCount} historical bookings.`);
}

backfillTrainerIds();
