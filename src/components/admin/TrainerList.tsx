'use client';

import { Button } from '@/components/ui/Button';
import { Eye, Power } from 'lucide-react';
import Link from 'next/link';
import styles from '@/components/ui/Button.module.css';
import clsx from 'clsx';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setTrainerActive } from '@/app/admin/trainers/actions';
import { Modal } from '@/components/ui/Modal';

interface Trainer {
    id: string;
    full_name: string;
    specialties: string[] | null;
    bio: string | null;
    avatar_url: string | null;
    profile_id?: string | null;
    is_active?: boolean | null;
}

// Trainers are never deleted: their past sessions would lose the trainer's name in the
// statistics. A trainer who leaves is deactivated instead.
export function TrainerList({ trainers }: { trainers: Trainer[] }) {
    const router = useRouter();
    const [target, setTarget] = useState<Trainer | null>(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

    const isActive = (t: Trainer) => t.is_active !== false;

    const handleToggle = async () => {
        if (!target) return;
        setBusy(true);
        const res = await setTrainerActive(target.id, !isActive(target));
        setBusy(false);
        setTarget(null);
        setNotice(res.error ? { text: res.error, error: true } : { text: res.message || 'Uložené.' });
        if (!res.error) router.refresh();
    };

    const sorted = [...trainers].sort((a, b) => Number(isActive(b)) - Number(isActive(a)));

    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E0DD', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E0DD' }}>
                <h3 style={{ fontFamily: 'serif', fontSize: '1.25rem', color: '#4A403A', margin: 0 }}>Tréneri</h3>
            </div>

            {notice && (
                <div role="status" style={{
                    margin: '1rem 1.5rem 0', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.9rem',
                    backgroundColor: notice.error ? '#FEF2F2' : '#F0FDF4',
                    color: notice.error ? '#991B1B' : '#166534',
                    border: `1px solid ${notice.error ? '#FECACA' : '#BBF7D0'}`
                }}>
                    {notice.text}
                </div>
            )}

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#FCFBF9', borderBottom: '1px solid #E5E0DD' }}>
                        <tr>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Meno a priezvisko</th>
                            <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Akcie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((trainer) => (
                            <tr key={trainer.id} style={{ borderBottom: '1px solid #f0f0f0', opacity: isActive(trainer) ? 1 : 0.6 }}>
                                <td style={{ padding: '1rem 1.5rem', color: '#333' }}>
                                    {trainer.full_name}
                                    {!isActive(trainer) && (
                                        <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '999px', padding: '0.1rem 0.55rem' }}>
                                            Neaktívny
                                        </span>
                                    )}
                                    {!trainer.profile_id && (
                                        <span style={{ marginLeft: '0.6rem', fontSize: '0.72rem', color: '#9A3412', backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '999px', padding: '0.1rem 0.55rem' }}>
                                            bez účtu
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', width: '260px' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <Link
                                            href={`/admin/trainers/${trainer.id}`}
                                            className={clsx(styles.button, styles.secondary, styles.sm)}
                                            style={{
                                                textDecoration: 'none',
                                                height: '32px',
                                                backgroundColor: 'transparent',
                                                border: '1px solid #E5E7EB',
                                                color: '#4B5563',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                boxShadow: 'none',
                                                padding: '0 0.75rem',
                                                flex: '0 0 auto'
                                            }}
                                        >
                                            <Eye size={14} />
                                            Detail
                                        </Link>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            style={{
                                                backgroundColor: isActive(trainer) ? '#8C4848' : '#5E715D',
                                                height: '32px', padding: '0 0.75rem', flex: '0 0 auto',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem'
                                            }}
                                            onClick={() => setTarget(trainer)}
                                        >
                                            <Power size={14} />
                                            {isActive(trainer) ? 'Deaktivovať' : 'Aktivovať'}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={!!target}
                onClose={() => setTarget(null)}
                title={target && isActive(target) ? 'Deaktivovať trénera' : 'Aktivovať trénera'}
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setTarget(null)}>
                            Zrušiť
                        </Button>
                        <Button variant="primary" disabled={busy} style={{ backgroundColor: '#93745F', borderColor: '#93745F' }} onClick={handleToggle}>
                            {busy ? 'Ukladám…' : 'Potvrdiť'}
                        </Button>
                    </>
                }
            >
                {target && isActive(target) ? (
                    <p>
                        Tréner <strong>{target.full_name}</strong> sa prestane ponúkať pri plánovaní nových hodín.
                        Jeho doterajšie hodiny, rezervácie aj štatistiky ostanú zachované a kedykoľvek ho môžete znova aktivovať.
                    </p>
                ) : (
                    <p>Tréner <strong>{target?.full_name}</strong> sa znova začne ponúkať pri plánovaní hodín.</p>
                )}
            </Modal>
        </div>
    );
}
