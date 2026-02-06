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
};

interface UserFormProps {
    initialData?: {
        id?: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        credits: number | null;
        role: string | null;
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
                    defaultValue={initialData?.full_name || ''}
                    icon={User}
                    required
                />

                <Input
                    label="Email"
                    name="email"
                    type="email"
                    defaultValue={initialData?.email || ''}
                    icon={Mail}
                    required
                    // Use readOnly so it is submitted in formData, allowing backend to access email for promotion logic
                    readOnly={!!initialData?.id}
                />

                <Input
                    label="Telefónne číslo"
                    name="phone"
                    type="tel"
                    defaultValue={initialData?.phone || ''}
                    icon={Phone}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Input
                        label="Kredity"
                        name="credits"
                        type="number"
                        defaultValue={initialData?.credits?.toString() || '0'}
                        icon={CreditCard}
                    />

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#4A403A', fontWeight: 500 }}>
                            Rola
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#8D8D8D' }} />
                            <select
                                name="role"
                                defaultValue={initialData?.role || 'user'}
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
                            </select>
                        </div>
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
                        <Button type="submit" variant="primary" style={{ backgroundColor: '#79665A', color: 'white' }}>
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
