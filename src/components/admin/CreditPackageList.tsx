'use client';

import { Edit2, Trash2, Calendar, Eye, CreditCard, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { deleteCreditPackage, CreditPackage } from '@/app/admin/credits/actions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function CreditPackageList({ packages }: { packages: CreditPackage[] }) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deletingId) return;
        await deleteCreditPackage(deletingId);
        setDeletingId(null);
    };

    if (!packages || packages.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
                Zatiaľ nie sú vytvorené žiadne kreditné balíčky.
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap: '1rem' }}>
            {packages.map((pkg) => (
                <div key={pkg.id} style={{
                    backgroundColor: '#fff',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #E5E0DD',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    opacity: pkg.is_active ? 1 : 0.7
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontFamily: 'serif', color: '#4A403A' }}>
                                    {pkg.title}
                                </h3>
                                {!pkg.is_active && (
                                    <span style={{ fontSize: '0.7rem', backgroundColor: '#eee', padding: '2px 6px', borderRadius: '4px', color: '#666' }}>
                                        Neaktívny
                                    </span>
                                )}
                                {pkg.is_popular && (
                                    <span style={{ fontSize: '0.7rem', backgroundColor: '#dbeafe', padding: '2px 6px', borderRadius: '4px', color: '#1e40af' }}>
                                        Populárny
                                    </span>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <CreditCard size={16} />
                                    {pkg.credits > 900000 ? (
                                        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>∞</span>
                                    ) : (
                                        <>
                                            {pkg.credits} kreditov
                                            {pkg.bonus_credits > 0 && <span style={{ color: '#059669', fontSize: '0.8rem' }}>(+{pkg.bonus_credits} bonus)</span>}
                                        </>
                                    )}
                                </span>

                                <span style={{ fontWeight: 600, color: '#4A403A' }}>
                                    {pkg.price} €
                                </span>

                                {pkg.validity_months && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Calendar size={16} />
                                        {pkg.validity_months} mes.
                                    </span>
                                )}
                            </div>

                            {pkg.description && (
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#888' }}>
                                    {pkg.description}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Link href={`/admin/credits/${pkg.id}`} style={{ textDecoration: 'none' }}>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        height: '36px',
                                        borderColor: '#E5E0DD',
                                        color: '#4A403A'
                                    }}
                                >
                                    <Edit2 size={16} />
                                    Upraviť
                                </Button>
                            </Link>

                            <Button
                                onClick={() => setDeletingId(pkg.id)}
                                variant="secondary"
                                size="sm"
                                style={{
                                    height: '36px',
                                    width: '36px',
                                    padding: 0,
                                    borderColor: '#fee2e2',
                                    backgroundColor: '#fef2f2',
                                    color: '#991b1b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}

            <Modal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                title="Vymazať balíček"
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setDeletingId(null)}>
                            Zrušiť
                        </Button>
                        <Button variant="primary" style={{ backgroundColor: '#991b1b', borderColor: '#991b1b' }} onClick={handleDelete}>
                            Vymazať
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete vymazať tento kreditný balíček? Táto akcia je nevratná.</p>
            </Modal>
        </div>
    );
}
