'use client';

import { useActionState } from 'react';
import { upsertCreditPackage, CreditPackage } from '@/app/admin/credits/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';
import { ChevronLeft, Euro, CreditCard, Star, Calendar } from 'lucide-react';
import { useState } from 'react';

const initialState = {
    message: null as string | null,
    inputs: null as any,
};

interface CreditPackageFormProps {
    initialData?: CreditPackage | null;
}

export function CreditPackageForm({ initialData }: CreditPackageFormProps) {
    const [state, formAction] = useActionState(upsertCreditPackage, initialState);

    return (
        <form action={formAction} style={{ maxWidth: '800px', margin: '0 auto' }}>
            {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}

            <div style={{ marginBottom: '2rem' }}>
                <Link href="/admin/credits" style={{ display: 'inline-flex', alignItems: 'center', color: '#666', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <ChevronLeft size={16} style={{ marginRight: '0.25rem' }} />
                    Späť na zoznam
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ fontFamily: 'serif', fontSize: '2rem', color: '#2c3e50', margin: 0 }}>
                        {initialData ? 'Upraviť balíček' : 'Nový balíček'}
                    </h1>
                </div>
            </div>

            {state?.message && (
                <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', marginBottom: '1rem', borderRadius: '4px' }}>
                    {state.message}
                </div>
            )}

            <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Basic Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#4A403A', fontWeight: 500 }}>
                                Názov balíčka
                            </label>
                            <input
                                name="title"
                                required
                                defaultValue={state?.inputs?.title ?? initialData?.title ?? ''}
                                style={{ width: '100%', padding: '0.75rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                placeholder="napr. Oasis Flow Pass"
                            />
                        </div>

                        <div>
                            <Input
                                label="Cena (€)"
                                name="price"
                                type="number"
                                step="0.01"
                                defaultValue={state?.inputs?.price?.toString() ?? initialData?.price?.toString() ?? ''}
                                required
                                icon={Euro}
                            />
                        </div>

                        <div>
                            <Input
                                label="Počet kreditov"
                                name="credits"
                                type="number"
                                defaultValue={state?.inputs?.credits?.toString() ?? initialData?.credits?.toString() ?? ''}
                                required
                                icon={CreditCard}
                            />
                        </div>

                        <div>
                            <Input
                                label="Bonusové kredity"
                                name="bonus_credits"
                                type="number"
                                defaultValue={state?.inputs?.bonus_credits?.toString() ?? initialData?.bonus_credits?.toString() ?? '0'}
                                icon={Star}
                            />
                        </div>

                        <div>
                            <Input
                                label="Platnosť (mesiace)"
                                name="validity_months"
                                type="number"
                                defaultValue={state?.inputs?.validity_months?.toString() ?? initialData?.validity_months?.toString() ?? ''}
                                icon={Calendar}
                                placeholder="Neobmedzená ak prázdne"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#4A403A', fontWeight: 500 }}>
                            Popis
                        </label>
                        <textarea
                            name="description"
                            rows={3}
                            defaultValue={state?.inputs?.description ?? initialData?.description ?? ''}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #E5E0DD', borderRadius: '4px', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={state?.inputs?.is_active ?? initialData?.is_active ?? true}
                            />
                            <span style={{ fontSize: '0.9rem' }}>Aktívny (zobrazený klientom)</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_popular"
                                defaultChecked={state?.inputs?.is_popular ?? initialData?.is_popular ?? false}
                            />
                            <span style={{ fontSize: '0.9rem' }}>Populárny (zvýraznený)</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifySelf: 'flex-end', marginTop: '1rem' }}>
                        <Button type="submit" style={{ width: '100%' }}>
                            ULOŽIŤ BALÍČEK
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
