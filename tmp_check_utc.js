const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrainingsUTC() {
    const { data: bookings } = await supabase.from('bookings').select('id, start_time, training_type_id');
    const { data: trainingTypes } = await supabase.from('training_types').select('id, title, schedule');
    
    const typesMap = {};
    for (const t of trainingTypes) {
        typesMap[t.id] = t;
    }
    
    let fallbackCount = 0;
    let matchCount = 0;

    for (const b of bookings) {
        const type = typesMap[b.training_type_id];
        if (!type || !type.schedule) continue;
        
        const dateObj = new Date(b.start_time);
        
        // Emulate UTC server behavior (original code)
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
            matchCount++;
        } else {
            fallbackCount++;
        }
    }
    
    console.log(`UTC Emulation -> Matches: ${matchCount}, Fallbacks: ${fallbackCount}`);
}

checkTrainingsUTC();
