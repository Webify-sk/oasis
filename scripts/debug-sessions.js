const fs = require('fs');
const tt = require('./tt.json');

const trainer = { id: '6d89289a-9fe7-44e9-a81e-2de076c2323d' };
const myTrainingTypes = tt.filter(t => t.schedule.some(s => s.trainer_id === trainer.id && s.active !== false));

const sessions = [];
const today = new Date('2026-03-02T12:00:00+01:00'); // set fixed start
today.setHours(0, 0, 0, 0);

for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayNames = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota', 'Nedeľa'];
    const dayName = dayNames[dayIndex];

    myTrainingTypes.forEach(t => {
        if (!Array.isArray(t.schedule)) return;

        t.schedule.forEach(term => {
            if (term.active === false) return;
            if (term.trainer_id !== trainer.id) return;

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
                        id: `${t.id}-${term.id}-${d.toISOString()}`,
                        trainingTypeId: t.id,
                        title: t.title,
                        startISO,
                        time: term.time,
                        dateObj: d,
                        capacity: t.capacity || 10
                    });
                }
            }
        });
    });
}
console.log("Sessions:", JSON.stringify(sessions, null, 2));
