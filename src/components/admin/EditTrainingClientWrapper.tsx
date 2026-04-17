'use client';

import { useState } from 'react';
import { TrainingForm } from '@/components/admin/TrainingForm';
import { SessionManager } from '@/components/admin/SessionManager';

interface EditTrainingClientWrapperProps {
    trainers: any[];
    training: any;
    exceptions: any[];
}

export function EditTrainingClientWrapper({ trainers, training, exceptions }: EditTrainingClientWrapperProps) {
    const [liveSchedule, setLiveSchedule] = useState<any[]>(training?.schedule || []);

    const addTerm = (date?: string) => {
        const d = date ? new Date(date) : new Date();
        const defaultDay = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'][d.getDay()];
        
        const newId = Date.now();
        setLiveSchedule([{
            id: newId,
            day: defaultDay,
            time: '18:00',
            trainer_id: trainers[0]?.id || '',
            active: true,
            isRecurring: !date, // If date provided, it's one-off by default, else recurring
            date: date ? date.split('T')[0] : ''
        }, ...liveSchedule]);

        return newId;
    };

    const removeTerm = (id: number) => {
        setLiveSchedule(liveSchedule.filter(t => t.id !== id));
    };

    const updateTerm = (id: number, field: string, value: any) => {
        setLiveSchedule(liveSchedule.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const updatedTraining = {
        ...training,
        schedule: liveSchedule
    };

    return (
        <>
            <TrainingForm
                trainers={trainers}
                initialData={training}
                schedule={liveSchedule}
            />

            <SessionManager
                training={updatedTraining}
                exceptions={exceptions}
                addTerm={addTerm}
                updateTerm={updateTerm}
                removeTerm={removeTerm}
                trainers={trainers}
            />
        </>
    );
}
