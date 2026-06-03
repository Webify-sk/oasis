const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countFallbacks() {
    const { data: bookings } = await supabase.from('bookings').select('id, start_time, training_type_id');
    const { data: trainingTypes } = await supabase.from('training_types').select('id, title, schedule');
    const { data: trainers } = await supabase.from('trainers').select('id, full_name');
    
    const typesMap = {};
    for (const t of trainingTypes) typesMap[t.id] = t;
    const trainersMap = {};
    for (const t of trainers) trainersMap[t.id] = t.full_name;
    
    let fallbackCounts = {};

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

        if (!scheduleItem?.trainer_id) {
            const firstTrainerId = type.schedule.find((s) => s.trainer_id)?.trainer_id;
            const trainerName = trainersMap[firstTrainerId] || 'Neznámy';
            fallbackCounts[trainerName] = (fallbackCounts[trainerName] || 0) + 1;
        }
    }
    
    console.log(fallbackCounts);
}

countFallbacks();
