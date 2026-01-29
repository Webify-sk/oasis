export interface Milestone {
    id: string;
    value: number; // e.g. 50, 100
    title: string; // "Core Commitment"
    subtitle: string; // "2 vstupy grátis"
    description: string;
}

export const milestones: Milestone[] = [
    { id: '1', value: 50, title: 'Core Commitment', subtitle: '2 vstupy grátis', description: '' },
    { id: '2', value: 100, title: 'Inner Glow Achiever', subtitle: 'Telové alebo pleťové ošetrenie grátis', description: '' },
    { id: '3', value: 150, title: 'Elite Flow', subtitle: '5 vstupov grátis + telové alebo pleťové ošetrenie grátis', description: '' },
    { id: '4', value: 200, title: 'Oasis Icon', subtitle: '10% zľava na všetky procedúry doživotne, 10 vstupová permanentka grátis + telové a pleťové ošetrenie grátis', description: '' },
];
