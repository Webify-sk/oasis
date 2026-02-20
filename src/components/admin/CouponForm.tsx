'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Loader2, Search, Percent, Currency, Users, CheckSquare, Square } from 'lucide-react';
import clsx from 'clsx';
import { generateCouponsAction } from '@/app/admin/coupons/actions';

interface User {
    id: string;
    full_name: string | null;
    email: string | null;
}

interface Training {
    id: string;
    title: string;
}

interface Booking {
    user_id: string;
    training_type_id: string;
}

export function CouponForm({ users, trainings, bookings }: { users: User[], trainings: Training[], bookings: Booking[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState<string>('');
    const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' || (
            user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesTraining = selectedTrainingId === '' || bookings.some(
            b => b.user_id === user.id && b.training_type_id === selectedTrainingId
        );

        return matchesSearch && matchesTraining;
    });

    const toggleUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleAllList = () => {
        if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
            // Deselect all in current view
            const newSelected = new Set(selectedUsers);
            filteredUsers.forEach(u => newSelected.delete(u.id));
            setSelectedUsers(newSelected);
        } else {
            // Select all in current view
            const newSelected = new Set(selectedUsers);
            filteredUsers.forEach(u => newSelected.add(u.id));
            setSelectedUsers(newSelected);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
            setError('Prosím zadajte platnú hodnotu zľavy väčšiu ako 0.');
            return;
        }

        if (discountType === 'percentage' && Number(discountValue) > 100) {
            setError('Percentuálna zľava nemôže byť väčšia ako 100%.');
            return;
        }

        if (selectedUsers.size === 0) {
            setError('Musíte vybrať aspoň jedného používateľa, ktorému sa kupón odošle.');
            return;
        }

        setLoading(true);

        try {
            const result = await generateCouponsAction({
                discountType,
                discountValue: Number(discountValue),
                targetUserIds: Array.from(selectedUsers)
            });

            if (result?.error) {
                setError(result.error);
                setLoading(false);
            } else {
                router.push('/admin/coupons');
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || 'Nastala neočakávaná chyba.');
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #f87171' }}>
                    {error}
                </div>
            )}

            {/* Krok 1: Hodnota zľavy */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', backgroundColor: '#f3f4f6', borderRadius: '50%', fontSize: '0.9rem', fontWeight: 'bold' }}>1</span>
                    Nastavenie zľavy
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div
                        onClick={() => setDiscountType('percentage')}
                        style={{
                            padding: '1.5rem',
                            border: `2px solid ${discountType === 'percentage' ? '#93745F' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: discountType === 'percentage' ? '#faf8f7' : 'white',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Percent size={24} color={discountType === 'percentage' ? '#93745F' : '#9ca3af'} />
                        <span style={{ fontWeight: 500, color: discountType === 'percentage' ? '#93745F' : '#4b5563' }}>Percentuálna zľava</span>
                    </div>

                    <div
                        onClick={() => setDiscountType('fixed')}
                        style={{
                            padding: '1.5rem',
                            border: `2px solid ${discountType === 'fixed' ? '#93745F' : '#e5e7eb'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: discountType === 'fixed' ? '#faf8f7' : 'white',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Currency size={24} color={discountType === 'fixed' ? '#93745F' : '#9ca3af'} />
                        <span style={{ fontWeight: 500, color: discountType === 'fixed' ? '#93745F' : '#4b5563' }}>Presná suma (€)</span>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '0.95rem' }}>
                        Hodnota zľavy ({discountType === 'percentage' ? '%' : '€'})
                    </label>
                    <input
                        type="number"
                        min="1"
                        step={discountType === 'percentage' ? "1" : "0.01"}
                        max={discountType === 'percentage' ? "100" : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? "Napr. 20" : "Napr. 50"}
                        style={{
                            width: '100%',
                            padding: '0.8rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#93745F'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        required
                    />
                </div>
            </div>

            {/* Krok 2: Výber používateľov */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', backgroundColor: '#f3f4f6', borderRadius: '50%', fontSize: '0.9rem', fontWeight: 'bold' }}>2</span>
                        Príjemcovia kupónov
                    </h2>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#eef2ff', color: '#4f46e5', padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600 }}>
                        <Users size={14} /> Vybraných: {selectedUsers.size}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Zobraziť podľa mena alebo emailu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.6rem 1rem 0.6rem 2.5rem',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                fontSize: '0.9rem',
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <select
                            value={selectedTrainingId}
                            onChange={(e) => {
                                setSelectedTrainingId(e.target.value);
                                setSelectedUsers(new Set()); // Reset selections on filter change
                            }}
                            style={{
                                width: '100%',
                                padding: '0.6rem 1rem',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                outline: 'none',
                                fontSize: '0.9rem',
                                backgroundColor: 'white',
                                color: selectedTrainingId ? '#111827' : '#6b7280',
                                appearance: 'none'
                            }}
                        >
                            <option value="">Filtrovať podľa odtrénovanej lekcie (Všetci)</option>
                            {trainings.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <div
                        onClick={toggleAllList}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            padding: '0.8rem 1rem',
                            backgroundColor: '#f9fafb',
                            borderBottom: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: '#374151'
                        }}
                    >
                        {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                            <CheckSquare size={18} color="#93745F" />
                        ) : (
                            <Square size={18} color="#9ca3af" />
                        )}
                        Označiť/Odznačiť zobrazených ({filteredUsers.length})
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {filteredUsers.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                                Žiadni používatelia nevyhovujú vyhľadávaniu.
                            </div>
                        ) : (
                            filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => toggleUser(user.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.8rem 1rem',
                                        borderBottom: '1px solid #f3f4f6',
                                        cursor: 'pointer',
                                        backgroundColor: selectedUsers.has(user.id) ? '#faf8f7' : 'white',
                                        transition: 'background-color 0.1s'
                                    }}
                                >
                                    {selectedUsers.has(user.id) ? (
                                        <CheckSquare size={18} color="#93745F" />
                                    ) : (
                                        <Square size={18} color="#d1d5db" />
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500, color: '#111827', fontSize: '0.95rem' }}>{user.full_name || 'Bez mena'}</span>
                                        <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{user.email}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Krok 3: Potvrdenie */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="submit"
                    disabled={loading || selectedUsers.size === 0 || !discountValue}
                    style={{ padding: '1rem 2rem', fontSize: '1.05rem', minWidth: '200px', display: 'flex', justifyContent: 'center' }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                            Generujem kupóny...
                        </>
                    ) : (
                        `Vygenerovať a odoslať kupóny (${selectedUsers.size})`
                    )}
                </Button>
            </div>
        </form>
    );
}
