const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMayStats() {
    // 1. Fetch Trainings Data for May 2026
    const { data: bookingsData } = await supabase
        .from('bookings')
        .select('id, start_time, user_id, participants_count, training_type_id')
        .gte('start_time', '2026-05-01T00:00:00Z')
        .lt('start_time', '2026-06-01T00:00:00Z');

    const { data: trainingTypesData } = await supabase.from('training_types').select('id, title, price_credits, schedule');
    const { data: trainersData } = await supabase.from('trainers').select('id, full_name, profile_id');
    const { data: profilesData } = await supabase.from('profiles').select('id, email, role');

    const trainingTypesMap = new Map(trainingTypesData.map(t => [t.id, t]));
    const trainersMap = new Map(trainersData.map(t => [t.id, t]));
    const usersMap = new Map(profilesData.map(p => [p.id, p]));
    const trainerProfileIds = new Set(trainersData.map(t => t.profile_id).filter(Boolean));

    const trainingSessionsMap = new Map();

    bookingsData.forEach(b => {
        const trainingType = trainingTypesMap.get(b.training_type_id);
        const user = usersMap.get(b.user_id);
        const dateObj = new Date(b.start_time);

        let trainerId = null;
        if (trainingType && trainingType.schedule && Array.isArray(trainingType.schedule)) {
            const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
            const dayName = slovakDays[dateObj.getUTCDay()];
            const timeString = `${String(dateObj.getUTCHours()).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')}`;
            const dateString = b.start_time.split('T')[0];

            const scheduleItem = trainingType.schedule.find((s) => {
                if (s.isRecurring !== false) {
                    return s.day === dayName && s.time && s.time.startsWith(timeString);
                } else {
                    return s.date === dateString && s.time && s.time.startsWith(timeString);
                }
            });

            if (scheduleItem?.trainer_id) {
                trainerId = scheduleItem.trainer_id;
            }
        }

        const trainerName = trainerId ? (trainersMap.get(trainerId)?.full_name || 'Neznámy tréner') : 'Neznámy tréner';
        const sessionKey = `train_${b.training_type_id}_${b.start_time}`;
        const existingSession = trainingSessionsMap.get(sessionKey);

        const STAFF_EMAILS = ['leskovjanskal@gmail.com', 'leonahochel@gmail.com'];
        const isAdminOrTrainer = user?.role === 'admin' || user?.role === 'employee' || 
            (b.user_id && trainerProfileIds.has(b.user_id)) || 
            (user?.email && STAFF_EMAILS.includes(user.email.toLowerCase()));
            
        const realParticipantsCount = isAdminOrTrainer ? 0 : (b.participants_count || 1);

        if (existingSession) {
            existingSession.participantsCount += realParticipantsCount;
        } else {
            trainingSessionsMap.set(sessionKey, {
                trainerName,
                participantsCount: realParticipantsCount,
                priceOrCredits: trainingType?.price_credits || 0
            });
        }
    });

    const trainerStats = {};

    trainingSessionsMap.forEach(session => {
        if (session.participantsCount > 0) {
            if (!trainerStats[session.trainerName]) {
                trainerStats[session.trainerName] = { sessions: 0, participants: 0, credits: 0 };
            }
            trainerStats[session.trainerName].sessions += 1;
            trainerStats[session.trainerName].participants += session.participantsCount;
            trainerStats[session.trainerName].credits += session.priceOrCredits * session.participantsCount;
        }
    });

    console.log("Stats for May 2026:");
    const results = Object.entries(trainerStats).map(([name, stats]) => ({
        Trainer: name,
        Trainings_Hours: stats.sessions,
        Participants: stats.participants,
        Credits_Value: stats.credits
    })).sort((a, b) => b.Trainings_Hours - a.Trainings_Hours);

    console.table(results);
}

checkMayStats();
