'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loader2, Search, Users, CheckSquare, Square, Mail, CheckCircle2 } from 'lucide-react';
import { sendBulkEmailAction } from '@/app/admin/newsletter/actions';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

const DEFAULT_EMAIL_HTML = `<p>Ahoj,</p><p>máme pre teba pár noviniek, o ktoré sa s tebou chceme podeliť.</p><p>Tešíme sa na tvoju ďalšiu návštevu 💫</p><p>S láskou,<br/>Laura &amp; Leona</p>`;

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

export function NewsletterForm({ users, trainings, bookings }: { users: User[], trainings: Training[], bookings: Booking[] }) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

    const [emailSubject, setEmailSubject] = useState('✨ Novinky z Oasis Lounge');
    const [emailHtml, setEmailHtml] = useState(DEFAULT_EMAIL_HTML);

    // Plain-text length of the editor content (to validate non-empty body)
    const htmlHasText = emailHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

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
            const newSelected = new Set(selectedUsers);
            filteredUsers.forEach(u => newSelected.delete(u.id));
            setSelectedUsers(newSelected);
        } else {
            const newSelected = new Set(selectedUsers);
            filteredUsers.forEach(u => newSelected.add(u.id));
            setSelectedUsers(newSelected);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        if (selectedUsers.size === 0) {
            setError('Musíte vybrať aspoň jedného príjemcu.');
            return;
        }

        if (!emailSubject.trim()) {
            setError('Zadajte predmet emailu.');
            return;
        }

        if (!htmlHasText) {
            setError('Zadajte text emailu.');
            return;
        }

        // Open the custom confirmation modal instead of a native window.confirm
        setShowConfirm(true);
    };

    const doSend = async () => {
        setShowConfirm(false);
        setLoading(true);

        try {
            const res = await sendBulkEmailAction({
                targetUserIds: Array.from(selectedUsers),
                emailSubject,
                emailHtml
            });

            if (res?.error) {
                setError(res.error);
            } else if (res?.success) {
                setResult({ sent: res.sent ?? 0, failed: res.failed ?? 0, total: res.total ?? 0 });
                setSelectedUsers(new Set());
            }
        } catch (err: any) {
            setError(err.message || 'Nastala neočakávaná chyba.');
        } finally {
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

            {result && (
                <div style={{ padding: '1rem', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CheckCircle2 size={20} />
                    <span>
                        Email odoslaný: <strong>{result.sent}</strong> z {result.total} príjemcov.
                        {result.failed > 0 && ` (${result.failed} sa nepodarilo odoslať)`}
                    </span>
                </div>
            )}

            {/* Krok 1: Výber príjemcov */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', backgroundColor: '#f3f4f6', borderRadius: '50%', fontSize: '0.9rem', fontWeight: 'bold' }}>1</span>
                        Príjemcovia
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
                                setSelectedUsers(new Set());
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

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
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

            {/* Krok 2: Obsah emailu */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', backgroundColor: '#f3f4f6', borderRadius: '50%', fontSize: '0.9rem', fontWeight: 'bold' }}>2</span>
                    Obsah emailu
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '0.95rem' }}>
                            Predmet emailu
                        </label>
                        <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151', fontSize: '0.95rem' }}>
                            Text emailu
                        </label>
                        <RichTextEditor initialValue={DEFAULT_EMAIL_HTML} onChange={setEmailHtml} />
                        <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#6b7280' }}>
                            Text môžete formátovať (tučné, kurzíva, nadpisy, zoznamy, odkazy) a vložiť obrázok cez ikonu na lište.
                            Email sa odošle v štandardnej Oasis Lounge šablóne, pod text bude vložené tlačidlo pre rezerváciu.
                        </p>
                    </div>
                </div>
            </div>

            {/* Odoslanie */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    type="submit"
                    disabled={loading || selectedUsers.size === 0 || !emailSubject.trim() || !htmlHasText}
                    style={{ padding: '1rem 2rem', fontSize: '1.05rem', minWidth: '200px', display: 'flex', justifyContent: 'center' }}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={18} style={{ marginRight: '0.5rem' }} />
                            Odosielam...
                        </>
                    ) : (
                        <>
                            <Mail size={18} style={{ marginRight: '0.5rem' }} />
                            Odoslať email ({selectedUsers.size})
                        </>
                    )}
                </Button>
            </div>

            {/* Confirmation modal (replaces native window.confirm) */}
            <Modal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                title="Odoslať email"
                titleAlign="left"
                actions={
                    <>
                        <Button type="button" variant="ghost" onClick={() => setShowConfirm(false)}>
                            Zrušiť
                        </Button>
                        <Button type="button" onClick={doSend}>
                            <Mail size={16} style={{ marginRight: '0.5rem' }} />
                            Odoslať ({selectedUsers.size})
                        </Button>
                    </>
                }
            >
                <p style={{ margin: 0 }}>
                    Naozaj chcete odoslať tento email <strong>{selectedUsers.size}</strong>{' '}
                    {selectedUsers.size === 1 ? 'príjemcovi' : 'príjemcom'}?
                </p>
            </Modal>
        </form>
    );
}
