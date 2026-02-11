'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { upsertTrainer } from '@/app/admin/trainers/actions';

const initialState = {
    message: '',
    inputs: null as any,
};

export function TrainerForm({ initialData }: { initialData?: any }) {
    const [state, formAction] = useActionState(upsertTrainer, initialState);

    // Styling constants (reused)
    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '4px',
        border: '1px solid #E5E0DD',
        fontSize: '0.9rem',
        fontFamily: 'inherit',
        color: '#4A403A',
        backgroundColor: '#fff',
        marginTop: '0.5rem'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.8rem',
        fontWeight: 600,
        color: '#666',
        marginBottom: '0',
        marginTop: '1.5rem'
    };

    return (
        <form action={formAction} style={{ maxWidth: '1000px' }}>
            {initialData?.id && <input type="hidden" name="id" value={initialData.id} />}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontFamily: 'serif', color: '#4A403A', margin: 0 }}>
                    {initialData ? 'Upraviť trénera' : 'Nový tréner'}
                </h2>
            </div>

            {state?.message && (
                <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', marginBottom: '1rem', borderRadius: '4px' }}>
                    {state.message}
                </div>
            )}

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                    <label style={{ ...labelStyle, marginTop: 0 }}>Meno</label>
                    <input name="full_name" required defaultValue={state?.inputs?.full_name ?? initialData?.full_name} style={inputStyle} placeholder="Peter" />

                    <label style={labelStyle}>E-mail</label>
                    <input name="email" type="email" defaultValue={state?.inputs?.email ?? initialData?.email} style={inputStyle} placeholder="email@priklad.com" />

                    <label style={labelStyle}>Telefón</label>
                    <input name="phone" defaultValue={state?.inputs?.phone ?? initialData?.phone} style={inputStyle} placeholder="0912 345 678" />

                    <label style={labelStyle}>Špecializácie (oddelené čiarkou)</label>
                    <input name="specialties" defaultValue={state?.inputs?.specialties ?? initialData?.specialties?.join(', ')} style={inputStyle} placeholder="Pilates, Joga" />

                    <label style={labelStyle}>Bio</label>
                    <textarea name="bio" rows={4} defaultValue={state?.inputs?.bio ?? initialData?.bio} style={{ ...inputStyle, resize: 'vertical' }} />

                    {/* Photo upload removed as per request to fix crash */}
                    {/* <input type="hidden" name="photo" value="" /> */}

                    <div style={{ marginTop: '2rem' }}>
                        <Button type="submit" style={{ backgroundColor: '#7D6A62' }}>
                            {initialData ? 'ULOŽIŤ ZMENY' : 'VYTVORIŤ TRÉNERA'}
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
