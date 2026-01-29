export interface TrainingSession {
    id: string;
    time: string;
    name: string;
    trainer: string;
    level: string;
    occupancy: {
        current: number;
        max: number;
    };
    isUserRegistered?: boolean;
}

export interface DaySchedule {
    date: string; // e.g., "Pondelok, 11.8.2025"
    sessions: TrainingSession[];
}

export const mockSchedule: DaySchedule[] = [
    {
        date: 'Pondelok, 11.8.2025',
        sessions: [
            { id: '1', time: '17:30 - 18:30', name: 'Pilates Flow', trainer: 'Meno priezvisko', level: 'Začiatočník', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
            { id: '2', time: '17:30 - 18:30', name: 'Stretching & Mobilita', trainer: 'Meno priezvisko', level: 'Pokročilý', occupancy: { current: 8, max: 8 }, isUserRegistered: false },
            { id: '3', time: '17:30 - 18:30', name: 'Torem ipsum', trainer: 'Meno priezvisko', level: 'Začiatočník', occupancy: { current: 5, max: 8 }, isUserRegistered: true },
            { id: '4', time: '17:30 - 18:30', name: 'Torem ipsum dolor sit amet', trainer: 'Meno priezvisko', level: 'Pokročilý', occupancy: { current: 8, max: 8 }, isUserRegistered: false },
        ]
    },
    {
        date: 'Utorok, 12.8.2025',
        sessions: [
            { id: '5', time: '17:30 - 18:30', name: 'Pilates Flow', trainer: 'Meno priezvisko', level: 'Začiatočník', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
            { id: '6', time: '17:30 - 18:30', name: 'Stretching & Mobilita', trainer: 'Meno priezvisko', level: 'Pokročilý', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
        ]
    },
    {
        date: 'Streda, 13.8.2025',
        sessions: [
            { id: '7', time: '17:30 - 18:30', name: 'Pilates Flow', trainer: 'Meno priezvisko', level: 'Začiatočník', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
            { id: '8', time: '17:30 - 18:30', name: 'Stretching & Mobilita', trainer: 'Meno priezvisko', level: 'Pokročilý', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
            { id: '9', time: '17:30 - 18:30', name: 'Torem ipsum', trainer: 'Meno priezvisko', level: 'Začiatočník', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
            { id: '10', time: '17:30 - 18:30', name: 'Torem ipsum dolor sit amet', trainer: 'Meno priezvisko', level: 'Pokročilý', occupancy: { current: 5, max: 8 }, isUserRegistered: false },
        ]
    }
];
