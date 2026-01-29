'use client';

import { Button } from '@/components/ui/Button';
import { Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Trainer {
    id: string;
    full_name: string;
    specialties: string[] | null;
    bio: string | null;
    avatar_url: string | null;
}

export function TrainerList({ trainers }: { trainers: Trainer[] }) {
    return (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E0DD', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E0DD' }}>
                <h3 style={{ fontFamily: 'serif', fontSize: '1.25rem', color: '#4A403A', margin: 0 }}>Tréneri</h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#FCFBF9', borderBottom: '1px solid #E5E0DD' }}>
                    <tr>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Meno a priezvisko</th>
                        <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#666', fontWeight: 600 }}>Akcie</th>
                    </tr>
                </thead>
                <tbody>
                    {trainers.map((trainer) => (
                        <tr key={trainer.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td style={{ padding: '1rem 1.5rem', color: '#333' }}>{trainer.full_name}</td>
                            <td style={{ padding: '1rem 1.5rem', width: '200px' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <Link href={`/admin/trainers/${trainer.id}`} style={{ textDecoration: 'none' }}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            style={{
                                                fontSize: '0.75rem',
                                                height: '32px',
                                                backgroundColor: 'transparent',
                                                border: '1px solid #E5E7EB',
                                                color: '#4B5563',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                boxShadow: 'none'
                                            }}
                                        >
                                            <Trash2 size={14} style={{ display: 'none' }} /> {/* Wrong icon import fallback prevention if needed */}
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {/* I need to import Eye first, currently only Trash2 is imported */}
                                                Zobraziť detail
                                            </span>
                                        </Button>
                                    </Link>
                                    <Button variant="primary" size="sm" style={{ backgroundColor: '#8C4848', height: '32px', padding: '0 0.5rem' }}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
