'use server';

import { createAdminClient } from '@/utils/supabase/admin';

export interface StatItem {
    id: string;
    type: 'training' | 'procedure';
    date: string; // ISO string
    title: string;
    personName: string; // Trainer or Therapist
    personId: string | null;
    customerName: string;
    customerId: string;
    priceOrCredits: number;
    participantsCount: number;
}

export async function getAdminStatistics(): Promise<{ items: StatItem[], error?: string }> {
    const supabase = createAdminClient();

    try {
        const items: StatItem[] = [];

        // 1. Fetch Trainings Data
        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                user_id,
                participants_count,
                training_type_id,
                status
            `);

        if (bookingsError) {
            console.error('Error fetching bookings:', bookingsError);
            return { items: [], error: 'Failed to fetch bookings data.' };
        }

        const { data: trainingTypesData, error: trainingTypesError } = await supabase
            .from('training_types')
            .select('id, title, price_credits, schedule');

        // 2. Fetch Cosmetic Procedures Data
        const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('cosmetic_appointments')
            .select(`
                id,
                start_time,
                user_id,
                service_id,
                employee_id,
                status,
                client_name
            `)
            .neq('status', 'cancelled');

        if (appointmentsError) {
            console.error('Error fetching appointments:', appointmentsError);
            return { items: [], error: 'Failed to fetch procedures data.' };
        }

        const { data: cosmeticServicesData } = await supabase
            .from('cosmetic_services')
            .select('id, title, price');

        const { data: employeesData } = await supabase
            .from('employees')
            .select('id, name');

        // 3. Fetch all related profiles (Users)
        const allUserIds = new Set<string>();
        bookingsData?.forEach(b => { if (b.user_id) allUserIds.add(b.user_id); });
        appointmentsData?.forEach(a => { if (a.user_id) allUserIds.add(a.user_id); });

        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', Array.from(allUserIds));

        // 4. Fetch all Trainers for Trainings
        const { data: trainersData } = await supabase
            .from('trainers')
            .select('id, full_name');

        // Maps for quick lookup
        const usersMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const trainingTypesMap = new Map(trainingTypesData?.map(t => [t.id, t]) || []);
        const cosmeticServicesMap = new Map(cosmeticServicesData?.map(s => [s.id, s]) || []);
        const employeesMap = new Map(employeesData?.map(e => [e.id, e]) || []);
        const trainersMap = new Map(trainersData?.map(t => [t.id, t]) || []);

        // Process Trainings
        const trainingSessionsMap = new Map<string, StatItem>();

        bookingsData?.forEach(b => {
            const trainingType = trainingTypesMap.get(b.training_type_id);
            const user = b.user_id ? usersMap.get(b.user_id) : null;
            const dateObj = new Date(b.start_time);

            // Try to find the trainer from the schedule
            let trainerId = null;
            if (trainingType && trainingType.schedule && Array.isArray(trainingType.schedule)) {
                // Determine day name in Slovak
                const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
                const dayName = slovakDays[dateObj.getDay()];
                // Extract HH:mm
                const timeString = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                const dateString = dateObj.toISOString().split('T')[0];

                const scheduleItem = trainingType.schedule.find((s: any) => {
                    if (s.isRecurring !== false) {
                        return s.day === dayName && s.time && s.time.startsWith(timeString);
                    } else {
                        return s.date === dateString && s.time && s.time.startsWith(timeString);
                    }
                });

                if (scheduleItem?.trainer_id) {
                    trainerId = scheduleItem.trainer_id;
                } else {
                    // Fallback to first trainer if exact match is not found
                    trainerId = trainingType.schedule.find((s: any) => s.trainer_id)?.trainer_id;
                }
            }

            const trainerName = trainerId ? (trainersMap.get(trainerId)?.full_name || 'Neznámy tréner') : 'Tréner neuvedený';

            const sessionKey = `train_${b.training_type_id}_${b.start_time}`;
            const existingSession = trainingSessionsMap.get(sessionKey);
            const currentCustomer = user?.full_name || user?.email || 'Neznámy klient';

            if (existingSession) {
                existingSession.participantsCount += (b.participants_count || 1);
                // Append customer name to the list
                if (!existingSession.customerName.includes(currentCustomer)) {
                    existingSession.customerName += `, ${currentCustomer}`;
                }
            } else {
                trainingSessionsMap.set(sessionKey, {
                    id: sessionKey,
                    type: 'training',
                    date: b.start_time,
                    title: trainingType?.title || 'Neznámy tréning',
                    personName: trainerName,
                    personId: trainerId,
                    customerName: currentCustomer,
                    customerId: b.user_id || 'unknown', // Just the first one
                    priceOrCredits: trainingType?.price_credits || 0,
                    participantsCount: b.participants_count || 1,
                });
            }
        });

        // Add all grouped training sessions to items array
        trainingSessionsMap.forEach(session => items.push(session));

        // Process Procedures
        appointmentsData?.forEach(a => {
            const service = cosmeticServicesMap.get(a.service_id);
            const user = a.user_id ? usersMap.get(a.user_id) : null;
            const employee = employeesMap.get(a.employee_id);

            items.push({
                id: `proc_${a.id}`,
                type: 'procedure',
                date: a.start_time,
                title: service?.title || 'Neznáma procedúra',
                personName: employee?.name || 'Neznáma terapeutka',
                personId: a.employee_id,
                customerName: a.client_name || user?.full_name || user?.email || 'Neznámy klient',
                customerId: a.user_id || 'unknown',
                priceOrCredits: service?.price || 0,
                participantsCount: 1, // Usually 1 for cosmetic procedures
            });
        });

        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { items };
    } catch (e: any) {
        console.error('Admin statistics fetch error:', e);
        return { items: [], error: e.message || 'Unknown error' };
    }
}
