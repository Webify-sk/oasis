import clsx from 'clsx';
import styles from './MilestoneList.module.css';

interface Milestone {
    id: number;
    training_count_required: number;
    title: string;
    subtitle: string;
    description: string;
}

interface MilestoneListProps {
    milestones: Milestone[];
    currentProgress: number;
}

export function MilestoneList({ milestones, currentProgress }: MilestoneListProps) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Ocenenia za míľniky</h3>
            </div>

            <div className={styles.timeline}>
                {milestones.map((milestone) => {
                    const isCompleted = currentProgress >= milestone.training_count_required;
                    const isCurrent = currentProgress === milestone.training_count_required; // Or close to it? Strict for now.

                    return (
                        <div key={milestone.id} className={styles.step}>
                            <div className={styles.circleContainer}>
                                <div className={clsx(styles.circle, {
                                    [styles.completed]: isCompleted,
                                    [styles.current]: isCurrent
                                })}>
                                    {milestone.training_count_required}
                                </div>
                            </div>

                            <div className={styles.content}>
                                <h4 className={styles.title}>{milestone.title}</h4>
                                <p className={styles.subtitle}>{milestone.subtitle}</p>
                                {milestone.description && <p className={styles.desc}>{milestone.description}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
