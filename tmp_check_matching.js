const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTrainings() {
    const { data: bookings } = await supabase.from('bookings').select('id, start_time, training_type_id');
    const { data: trainingTypes } = await supabase.from('training_types').select('id, title, schedule');
    const { data: trainers } = await supabase.from('trainers').select('id, full_name');
    
    const typesMap = {};
    for (const t of trainingTypes) {
        typesMap[t.id] = t;
    }
    const trainersMap = {};
    for (const t of trainers) {
        trainersMap[t.id] = t.full_name;
    }
    
    let fallbackCount = 0;
    let matchCount = 0;
    
    const { formatInTimeZone } = require('date-fns-tz');
    const { sk } = require('date-fns/locale');

    for (const b of bookings) {
        const type = typesMap[b.training_type_id];
        if (!type || !type.schedule) continue;
        
        const dayNameLower = formatInTimeZone(b.start_time, 'Europe/Bratislava', 'EEEE', { locale: sk });
        const dayName = dayNameLower.charAt(0).toUpperCase() + dayNameLower.slice(1);
        const timeString = formatInTimeZone(b.start_time, 'Europe/Bratislava', 'HH:mm');
        const dateString = formatInTimeZone(b.start_time, 'Europe/Bratislava', 'yyyy-MM-dd');

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
            const firstTrainer = type.schedule.find((s) => s.trainer_id)?.trainer_id;
            console.log(`Fallback for ${type.title} on ${b.start_time} (Day: ${dayName}, Time: ${timeString}). First trainer: ${trainersMap[firstTrainer]}`);
        }
    }
    
    console.log(`Matches: ${matchCount}, Fallbacks: ${fallbackCount}`);
}

checkTrainings();
