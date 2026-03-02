import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Dumbbell, Users, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

export async function TrainerDashboardView() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/auth');
    }

    // Check if user has trainer or admin role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'trainer' && profile?.role !== 'admin') {
         redirect('/dashboard');
    }

    // Fetch trainer record linked to this user
    const { data: trainer } = await supabase
        .from('trainers')
        .select('*')
        .eq('profile_id', user.id)
        .single();

    if (!trainer) {
        return (
            <div style={{ padding: '0rem' }}>
                <h1 style={{ fontFamily: 'serif', color: '#4A403A', marginBottom: '1.5rem' }}>Trénerská Zóna</h1>
                <div style={{ padding: '2rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>Pre tento účet nie je vytvorený profil trénera.</p>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>Kontaktujte administrátora (alebo si vytvorte profil trénera v admin paneli a priraďte k nemu svoj účet).</p>
                </div>
            </div>
        );
    }

    // Fetch Training Types
    const { data: trainingTypes } = await supabase
        .from('training_types')
        .select('*');

    // Filter to ones where this trainer teaches
    const myTrainingTypes = trainingTypes?.filter(tt => {
        if (!Array.isArray(tt.schedule)) return false;
        return tt.schedule.some((s: any) => s.trainer_id === trainer.id && s.active !== false);
    }) || [];

    // Generate upcoming sessions (next 14 days)
    const sessions: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dayOfWeek = d.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
        const dayName = dayNames[dayIndex];

        myTrainingTypes.forEach(tt => {
            if (!Array.isArray(tt.schedule)) return;

            tt.schedule.forEach((term: any) => {
                if (term.active === false) return;
                if (term.trainer_id !== trainer.id) return; // Only show my terms!

                let matches = false;
                if (term.isRecurring !== false) {
                    if (term.day === dayName) matches = true;
                } else if (term.date) {
                    const termDate = new Date(term.date);
                    if (termDate.toDateString() === d.toDateString()) matches = true;
                }

                if (matches) {
                    let timeStr = term.time;
                    if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    if (!isNaN(hours)) {
                        const startTimestamp = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), hours, minutes, 0, 0);
                        const startISO = new Date(startTimestamp).toISOString();

                        sessions.push({
                            id: `${tt.id}-${term.id}-${d.toISOString()}`,
                            trainingTypeId: tt.id,
                            title: tt.title,
                            startISO,
                            time: term.time,
                            dateObj: d,
                            capacity: tt.capacity || 10
                        });
                    }
                }
            });
        });
    }

    sessions.sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime());

    // Fetch Bookings for these sessions
    let sessionsWithBookings = sessions;

    if (sessions.length > 0 && myTrainingTypes.length > 0) {
        const minISO = sessions[0].startISO;
        const maxISO = sessions[sessions.length - 1].startISO;

        const { data: bookings } = await supabase
            .from('bookings')
            .select(`
                id,
                start_time,
                participants_count,
                training_type_id,
                user_id,
                user:profiles(full_name, phone, email)
            `)
            .in('training_type_id', myTrainingTypes.map(tt => tt.id))
            .gte('start_time', minISO)
            .lte('start_time', maxISO);

        // Group bookings by session
        sessionsWithBookings = sessions.map(session => {
            const sessionBookings = bookings?.filter(b => 
                b.training_type_id === session.trainingTypeId && 
                Math.abs(new Date(b.start_time).getTime() - new Date(session.startISO).getTime()) < 60000
            ) || [];

            const totalParticipants = sessionBookings.reduce((sum, b) => sum + (b.participants_count || 1), 0);

            return {
                ...session,
                bookings: sessionBookings,
                totalParticipants
            };
        });
    }

    const nowTime = new Date().getTime();
    const upcomingSessions = sessionsWithBookings.filter(s => new Date(s.startISO).getTime() >= nowTime);
    const upcomingSessionsCount = upcomingSessions.length;
    const upcomingParticipantsCount = upcomingSessions.reduce((sum, s) => sum + s.totalParticipants, 0);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
                marginBottom: '2rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                <div>
                    <h1 style={{ fontFamily: 'serif', color: '#4A403A', margin: '0 0 0.5rem 0', fontSize: '2rem' }}>Moje tréningy</h1>
                    <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>Prehľad naplánovaných tréningov na najbližších 14 dní.</p>
                </div>
                <div style={{ backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', padding: '0.75rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366F1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {trainer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Tréner</div>
                        <div style={{ color: '#1E1B4B', fontWeight: 500 }}>{trainer.full_name}</div>
                    </div>
                </div>
            </div>

            {/* Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                        <Calendar size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500, marginBottom: '0.25rem' }}>Nadchádzajúce tréningy</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{upcomingSessionsCount}</div>
                    </div>
                </div>
                
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                        <Users size={28} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500, marginBottom: '0.25rem' }}>Očakávaní účastníci</div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{upcomingParticipantsCount}</div>
                    </div>
                </div>
            </div>

            <h2 style={{ fontFamily: 'serif', color: '#4A403A', fontSize: '1.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '2px solid #E5E0DD' }}>Rozvrh tréningov</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {sessionsWithBookings.length === 0 ? (
                    <div style={{ padding: '4rem 2rem', backgroundColor: '#fff', textAlign: 'center', borderRadius: '16px', border: '2px dashed #E5E7EB' }}>
                        <div style={{ width: '80px', height: '80px', backgroundColor: '#F3F4F6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                            <Dumbbell size={40} color="#9CA3AF" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: '#374151', margin: '0 0 0.5rem 0' }}>Žiadne naplánované tréningy</h3>
                        <p style={{ color: '#6B7280', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>Na najbližších 14 dní nemáte v rozvrhu žiadne aktívne tréningy.</p>
                    </div>
                ) : (
                    sessionsWithBookings.map((session) => {
                        const isPast = new Date(session.startISO).getTime() < nowTime;
                        
                        return (
                            <div key={session.id} style={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid',
                                borderColor: isPast ? '#E5E7EB' : '#D1D5DB', 
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: isPast ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                                opacity: isPast ? 0.75 : 1,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                position: 'relative'
                            }}>
                                {!isPast && (
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', backgroundColor: '#10B981' }} />
                                )}
                                <div style={{ 
                                    padding: '1.5rem 2rem', 
                                    borderBottom: '1px solid #E5E7EB',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backgroundColor: isPast ? '#F9FAFB' : '#fff',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                    paddingLeft: !isPast ? '2.5rem' : '2rem'
                                }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <h3 style={{ margin: 0, fontFamily: 'serif', color: '#1F2937', fontSize: '1.35rem' }}>
                                                {session.title}
                                            </h3>
                                            {isPast && <span style={{ fontSize: '0.7rem', backgroundColor: '#E5E7EB', color: '#4B5563', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uplynulé</span>}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: '#4B5563', fontSize: '0.95rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Calendar size={18} color="#9CA3AF" />
                                                <span style={{ fontWeight: 500 }}>{session.dateObj.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Clock size={18} color="#9CA3AF" />
                                                <span style={{ fontWeight: 500 }}>{session.time}</span>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style={{
                                        backgroundColor: session.totalParticipants >= session.capacity ? '#FEF2F2' : (session.totalParticipants > 0 ? '#F0FDF4' : '#F3F4F6'),
                                        border: '1px solid',
                                        borderColor: session.totalParticipants >= session.capacity ? '#FCA5A5' : (session.totalParticipants > 0 ? '#86EFAC' : '#E5E7EB'),
                                        padding: '0.75rem 1.25rem',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        minWidth: '160px',
                                        justifyContent: 'center'
                                    }}>
                                        <Users size={20} color={session.totalParticipants >= session.capacity ? '#DC2626' : (session.totalParticipants > 0 ? '#16A34A' : '#9CA3AF')} />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ color: session.totalParticipants >= session.capacity ? '#991B1B' : (session.totalParticipants > 0 ? '#166534' : '#6B7280'), fontSize: '1.1rem', fontWeight: 700, lineHeight: 1 }}>
                                                {session.totalParticipants} / {session.capacity}
                                            </div>
                                            <div style={{ fontSize: '0.7rem', color: session.totalParticipants >= session.capacity ? '#DC2626' : (session.totalParticipants > 0 ? '#15803D' : '#9CA3AF'), textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginTop: '0.2rem' }}>
                                                Prihlásených
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{ padding: '1.5rem 2rem', backgroundColor: isPast ? '#F3F4F6' : '#FAFAFA', paddingLeft: !isPast ? '2.5rem' : '2rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        Zoznam účastníkov {session.totalParticipants > 0 && `(${session.totalParticipants})`}
                                    </h4>
                                    
                                    {session.bookings.length === 0 ? (
                                        <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #D1D5DB' }}>
                                            <p style={{ margin: 0, fontSize: '0.95rem', color: '#9CA3AF' }}>Na tento tréning sa zatiaľ nikto neprihlásil.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                            {session.bookings.map((booking: any) => {
                                                const userData = Array.isArray(booking.user) ? booking.user[0] : booking.user;
                                                const userName = userData?.full_name || 'Neznámy užívateľ';
                                                const initial = userName.charAt(0).toUpperCase();
                                                
                                                return (
                                                    <div key={booking.id} style={{ 
                                                        backgroundColor: '#fff', 
                                                        padding: '1rem', 
                                                        borderRadius: '8px', 
                                                        border: '1px solid #E5E7EB',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '1rem',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                    }}>
                                                        <div style={{ 
                                                            width: '40px', 
                                                            height: '40px', 
                                                            borderRadius: '50%', 
                                                            backgroundColor: '#F3F4F6',
                                                            color: '#4B5563',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 600,
                                                            flexShrink: 0
                                                        }}>
                                                            {initial}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {userName}
                                                            </div>
                                                            {(userData?.email || userData?.phone) && (
                                                                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {userData?.phone && <span style={{ marginRight: '0.5rem' }}>{userData.phone}</span>}
                                                                    {userData?.email && <span>{userData.email}</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {booking.participants_count > 1 && (
                                                            <div style={{ 
                                                                backgroundColor: '#DBEAFE', 
                                                                color: '#1D4ED8', 
                                                                padding: '0.25rem 0.5rem', 
                                                                borderRadius: '9999px', 
                                                                fontSize: '0.75rem', 
                                                                fontWeight: 700,
                                                                whiteSpace: 'nowrap',
                                                                marginLeft: 'auto'
                                                            }}>
                                                                +{booking.participants_count - 1}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
