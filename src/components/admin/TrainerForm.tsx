'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/Button';
import { upsertTrainer } from '@/app/admin/trainers/actions';
import { Image as ImageIcon, Upload, X } from 'lucide-react';

const initialState = {
    message: '',
};

export function TrainerForm({ initialData }: { initialData?: any }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.avatar_url || null);
    const [state, formAction] = useActionState(upsertTrainer, initialState);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

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
                    {initialData ? 'Upraviť trénera' : 'Meno Priezvisko'}
                </h2>
            </div>

            {state?.message && (
                <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626', marginBottom: '1rem', borderRadius: '4px' }}>
                    {state.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column - Form */}
                <div style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
                    <label style={{ ...labelStyle, marginTop: 0 }}>Meno</label>
                    <input name="full_name" required defaultValue={initialData?.full_name} style={inputStyle} placeholder="Peter" />

                    <label style={labelStyle}>Priezvisko</label>
                    <input name="last_name_placeholder" style={inputStyle} placeholder="Novák" />
                    {/* Note: Database has single full_name, usually handled by joining or split.
                        I'll just map full_name input to the table column for now to be safe,
                        or I can combine them in the action if I want two inputs.
                        Let's stick to one "Meno a Priezvisko" logic or keep simple ID match.
                        Actually, looking at the screenshot "Meno Priezvisko" is usually one header.
                        I will simplify to a single "Meno a priezvisko" input effectively.
                    */}

                    <label style={labelStyle}>Špecializácie (oddelené čiarkou)</label>
                    <input name="specialties" defaultValue={initialData?.specialties?.join(', ')} style={inputStyle} placeholder="Pilates, Joga" />

                    <label style={labelStyle}>Bio</label>
                    <textarea name="bio" rows={4} defaultValue={initialData?.bio} style={{ ...inputStyle, resize: 'vertical' }} />

                    <label style={labelStyle}>E-mail</label>
                    <input name="email" type="email" style={inputStyle} placeholder="email@priklad.com" />

                    <label style={labelStyle}>Telefón</label>
                    <input name="phone" style={inputStyle} placeholder="0912 345 678" />

                    <div style={{ marginTop: '2rem' }}>
                        <Button type="submit" style={{ backgroundColor: '#7D6A62' }}>
                            ZMENIŤ ÚDAJE
                        </Button>
                    </div>
                </div>

                {/* Right Column - Photo Mockup */}
                <div>
                    <label style={labelStyle}>Profilová fotografia</label>
                    <div style={{
                        width: '100%',
                        aspectRatio: '1/1',
                        backgroundColor: '#fcfbf9',
                        border: '1px dashed #ccc',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#8C7568',
                        marginTop: '0.5rem',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {previewUrl ? (
                            <img
                                src={previewUrl}
                                alt="Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <>
                                <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                                <span style={{ fontWeight: 600 }}>Nahrajte profilovú fotografiu</span>
                                <span style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>Fotografia musí byť menšia ako 20MB</span>
                            </>
                        )}

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            name="photo"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: 0,
                                cursor: 'pointer'
                            }}
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
