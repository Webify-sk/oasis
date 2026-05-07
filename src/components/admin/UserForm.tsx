'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { upsertUser, deleteUser } from '@/app/admin/users/actions';
import { User, Phone, Mail, CreditCard, Shield } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useRouter } from 'next/navigation';

const initialState = {
    message: null as string | null,
    inputs: null as any,
};

interface UserFormProps {
    initialData?: {
        id?: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        credits: number | null;
        credits_expire_at?: string | null;
        role: string | null;
        batches?: {
            id: string;
            amount: number;
            remaining_amount: number;
            expires_at: string | null;
        }[];
    } | null;
}

export function UserForm({ initialData }: UserFormProps) {
    const [state, formAction] = useActionState(upsertUser, initialState);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!initialData?.id) return;
        setIsDeleting(true);
        const res = await deleteUser(initialData.id);
        setIsDeleting(false);

        if (res.success) {
            router.push('/admin/users');
            router.refresh();
        } else {
            alert(res.message); // Should ideally use a toast or set error state, but alert is fine for now as per "simple admin"
        }
    };

    return (
        <form action={formAction} style={{ maxWidth: '600px', backgroundColor: '#fff', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD' }}>
            <h2 style={{ fontFamily: 'serif', marginBottom: '1.5rem', color: '#4A403A' }}>
                {initialData?.id ? 'Upraviť užívateľa' : 'Nový užívateľ'}
            </h2>

            {state?.message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    borderRadius: '4px',
                    backgroundColor: state.message.includes('úspeš') ? '#f0fdf4' : '#fef2f2',
                    color: state.message.includes('úspeš') ? '#166534' : '#991b1b',
                    border: `1px solid ${state.message.includes('úspeš') ? '#bbf7d0' : '#fecaca'}`
                }}>
                    {state.message}
                </div>
            )}

            <input type="hidden" name="id" value={initialData?.id || ''} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <Input
                    label="Meno a Priezvisko"
                    name="full_name"
                    defaultValue={state?.inputs?.full_name ?? initialData?.full_name ?? ''}
                    icon={User}
                    required
                />

                <Input
                    label="Email"
                    name="email"
                    type="email"
                    defaultValue={state?.inputs?.email ?? initialData?.email ?? ''}
                    icon={Mail}
                    required
                    // Use readOnly so it is submitted in formData, allowing backend to access email for promotion logic
                    readOnly={!!initialData?.id}
                />

                <Input
                    label="Telefónne číslo"
                    name="phone"
                    type="tel"
                    defaultValue={state?.inputs?.phone ?? initialData?.phone ?? ''}
                    icon={Phone}
                />
                {/* Existujúce aktívne vstupy (Batches) zobrazené administrátorovi v zozname */}
                {initialData?.id && (
                    <div style={{ backgroundColor: '#F9F9F9', border: '1px solid #E5E0DD', borderRadius: '4px', padding: '1rem' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#4A403A' }}>
                            Aktívne dávky vstupov ({initialData.batches?.reduce((sum, b) => sum + Number(b.remaining_amount), 0) || 0} celkom)
                        </h4>
                        
                        {(!initialData.batches || initialData.batches.length === 0) ? (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>Žiadne platné vstupy.</p>
                        ) : (
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#666' }}>
                                {initialData.batches.map(b => (
                                    <li key={b.id} style={{ marginBottom: '4px' }}>
                                        <strong>{b.remaining_amount}x</strong> 
                                        {b.expires_at ? ` (Platí do: ${new Date(b.expires_at).toLocaleDateString('sk-SK')})` : ' (Neobmedzene)'}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: '#F0FDF4', padding: '1rem', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                    <div style={{ gridColumn: 'span 3' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#065F46' }}>➕ Pridať novú dávku vstupov (Voliteľné)</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#047857' }}>Vyplňte tieto polia iba ak chcete tomuto klientovi manuálne navýšiť vstupy.</p>
                    </div>

                    <Input
                        label="Počet vstupov"
                        name="new_batch_amount"
                        type="number"
                        defaultValue=""
                        icon={CreditCard}
                    />

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#065F46', fontWeight: 500 }}>
                            Expirácia novej dávky
                        </label>
                        <input
                            type="date"
                            name="new_batch_expire_at"
                            defaultValue=""
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '1px solid #A7F3D0',
                                borderRadius: '4px',
                                fontSize: '1rem',
                                color: '#065F46',
                                outline: 'none',
                                backgroundColor: '#fff'
                            }}
                        />
                    </div>
                </div>

                {initialData?.id && initialData?.batches && initialData.batches.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#FEF2F2', padding: '1rem', borderRadius: '4px', border: '1px solid #FECACA' }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#991B1B' }}>➖ Odobrať vstupy z konkrétnej dávky (Voliteľné)</h4>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: '#B91C1C' }}>Zadajte počet vstupov, ktoré chcete odobrať.</p>
                        </div>
                        {initialData.batches.map(batch => (
                            <div key={batch.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid #FCA5A5', paddingTop: '0.5rem' }}>
                                <div style={{ flex: 1, fontSize: '0.85rem', color: '#7F1D1D' }}>
                                    <strong>Dávka:</strong> {batch.expires_at ? `Platí do ${new Date(batch.expires_at).toLocaleDateString('sk-SK')}` : 'Neobmedzená'} (Zostatok: {batch.remaining_amount})
                                </div>
                                <div style={{ width: '100px' }}>
                                    <input
                                        type="number"
                                        name={`remove_batch_${batch.id}`}
                                        defaultValue=""
                                        placeholder="0"
                                        min="0"
                                        max={batch.remaining_amount}
                                        style={{
                                            width: '100%',
                                            padding: '0.4rem',
                                            border: '1px solid #FECACA',
                                            borderRadius: '4px',
                                            outline: 'none',
                                            textAlign: 'center'
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                    
                    {/* Skrytý pôvodný credits pre bezpečnosť DB integrity */}
                    <input type="hidden" name="credits" value={initialData?.credits?.toString() || '0'} />
                    <input type="hidden" name="credits_expire_at" value={initialData?.credits_expire_at || ''} />
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#4A403A', fontWeight: 500 }}>
                            Rola
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
                            <select
                                name="role"
                                defaultValue={state?.inputs?.role ?? initialData?.role ?? 'user'}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    border: '1px solid #E5E0DD',
                                    borderRadius: '4px',
                                    fontSize: '1rem',
                                    color: '#4A403A',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: '#fff'
                                }}
                            >
                                <option value="user">User</option>
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                                <option value="trainer">Trainer</option>
                            </select>
                        </div>
                    </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    {initialData?.id && (
                        <Button
                            type="button"
                            variant="primary"
                            style={{ backgroundColor: '#DC2626', color: 'white' }}
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Vymazať užívateľa
                        </Button>
                    )}

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Button type="button" variant="ghost" onClick={() => window.history.back()}>
                            Zrušiť
                        </Button>
                        <Button type="submit" variant="primary" style={{ backgroundColor: '#93745F', color: 'white' }}>
                            ULOŽIŤ ZMENY
                        </Button>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Vymazať užívateľa"
                actions={(
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', width: '100%' }}>
                        <Button type="button" variant="ghost" onClick={() => setShowDeleteModal(false)}>
                            Zrušiť
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            style={{ backgroundColor: '#DC2626', color: 'white' }}
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Mažem...' : 'Potvrdiť vymazanie'}
                        </Button>
                    </div>
                )}
            >
                <p>Naozaj chcete vymazať tohto užívateľa? Táto akcia je nevratná.</p>
            </Modal>
        </form>
    );
}
