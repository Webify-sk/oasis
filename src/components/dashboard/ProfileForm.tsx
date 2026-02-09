'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { updateProfile } from '@/app/dashboard/profile/actions';
import { resetPassword } from '@/app/auth/actions';
import clsx from 'clsx';
import { Modal } from '@/components/ui/Modal';
import styles from './ProfileForm.module.css';

import { redeemVoucher } from '@/app/dashboard/profile/actions';

interface ProfileFormProps {
    user: {
        email: string | undefined;
        full_name: string | null;
        phone: string | null;
        date_of_birth?: string | null;
        role?: string;
        billing_name?: string;
        billing_street?: string;
        billing_city?: string;
        billing_zip?: string;
        billing_country?: string;
    }
}

export function ProfileForm({ user }: ProfileFormProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Voucher State
    const [voucherCode, setVoucherCode] = useState('');
    const [paramVoucherLoading, setVoucherLoading] = useState(false);
    const [voucherMessage, setVoucherMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleResetPassword = async () => {
        if (!user.email) return;

        setShowResetModal(false); // Close modal immediately
        setMessage({ type: 'success', text: 'Odosielam...' });

        const res = await resetPassword(user.email);

        if (res?.success) {
            setMessage({ type: 'success', text: res.message });
        } else {
            setMessage({ type: 'error', text: res.message || 'Chyba pri odosielaní.' });
        }

        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        await updateProfile(formData);
        setIsEditing(false);
        setIsLoading(false);
    };

    const handleRedeemVoucher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voucherCode.trim()) return;

        setVoucherLoading(true);
        setVoucherMessage(null);

        const res = await redeemVoucher(voucherCode);

        setVoucherLoading(false);
        if (res.success) {
            setVoucherMessage({ type: 'success', text: res.message || 'Voucher uplatnený!' });
            setVoucherCode(''); // Clear input
        } else {
            setVoucherMessage({ type: 'error', text: res.message || 'Chyba.' });
        }
    };

    if (isEditing) {
        return (
            <div className={styles.card}>
                <h3 className={styles.title}>Osobné údaje</h3>

                <form action={handleSubmit}>
                    <div className={styles.grid}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Meno a priezvisko</label>
                            <input
                                name="full_name"
                                defaultValue={user.full_name || ''}
                                placeholder="Zadajte meno a priezvisko"
                                className={styles.input}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>E-mail</label>
                            <div className={styles.staticValue} style={{ color: '#6B7280' }}>
                                {user.email}
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Telefón</label>
                            <input
                                name="phone"
                                defaultValue={user.phone || ''}
                                placeholder="Zadajte telefónne číslo"
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Dátum narodenia</label>
                            <input
                                name="date_of_birth"
                                type="date"
                                defaultValue={user.date_of_birth || ''}
                                className={styles.input}
                                readOnly
                                title="Pre zmenu dátumu narodenia kontaktujte správcu."
                                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', color: '#888' }}
                            />
                        </div>
                    </div>

                    {user.role !== 'employee' && (
                        <>
                            <h4 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>Fakturačné údaje</h4>
                            <div className={styles.grid}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Fakturačné meno / Firma</label>
                                    <input name="billing_name" defaultValue={user.billing_name || ''} placeholder="Názov firmy alebo Meno" className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Ulica a číslo</label>
                                    <input name="billing_street" defaultValue={user.billing_street || ''} placeholder="Ulica 123" className={styles.input} />
                                </div>
                                <div className={styles.formGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className={styles.label}>Mesto</label>
                                        <input name="billing_city" defaultValue={user.billing_city || ''} placeholder="Mesto" className={styles.input} />
                                    </div>
                                    <div>
                                        <label className={styles.label}>PSČ</label>
                                        <input name="billing_zip" defaultValue={user.billing_zip || ''} placeholder="000 00" className={styles.input} />
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Štát</label>
                                    <input name="billing_country" defaultValue={user.billing_country || 'Slovensko'} placeholder="Slovensko" className={styles.input} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className={styles.actions}>
                        <div className={styles.editActions}>
                            <Button type="submit" variant="primary" disabled={isLoading}>
                                {isLoading ? 'Ukladám...' : 'Uložiť zmeny'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                                Zrušiť
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Profile Card */}
            <div className={styles.card}>
                <h3 className={styles.title}>Osobné údaje</h3>

                <div className={styles.grid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Meno a priezvisko</label>
                        <div className={styles.staticValue}>
                            {user.full_name || <span className={styles.placeholder}>Nezadané</span>}
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>E-mail</label>
                        <div className={styles.staticValue}>
                            {user.email}
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Telefón</label>
                        <div className={styles.staticValue}>
                            {user.phone || <span className={styles.placeholder}>Nezadané</span>}
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Dátum narodenia</label>
                        <div className={styles.staticValue}>
                            {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('sk-SK') : <span className={styles.placeholder}>Nezadané</span>}
                        </div>
                    </div>
                </div>

                {user.role !== 'employee' && (
                    <>
                        <h4 style={{ fontSize: '1.2rem', marginTop: '2rem', marginBottom: '1rem', color: '#4A403A' }}>Fakturačné údaje</h4>
                        <div className={styles.grid}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Fakturačné meno / Firma</label>
                                <div className={styles.staticValue}>{user.billing_name || <span className={styles.placeholder}>Nezadané</span>}</div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Ulica a číslo</label>
                                <div className={styles.staticValue}>{user.billing_street || <span className={styles.placeholder}>Nezadané</span>}</div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Mesto a PSČ</label>
                                <div className={styles.staticValue}>
                                    {user.billing_city ? `${user.billing_city}, ${user.billing_zip}` : <span className={styles.placeholder}>Nezadané</span>}
                                </div>
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Štát</label>
                                <div className={styles.staticValue}>{user.billing_country || 'Slovensko'}</div>
                            </div>
                        </div>
                    </>
                )}

                <div className={styles.actions}>
                    <Button variant="primary" onClick={() => setIsEditing(true)}>Upraviť profil</Button>

                    <div className={styles.secondaryActions}>
                        {message && (
                            <span className={clsx(styles.message, {
                                [styles.success]: message.type === 'success',
                                [styles.error]: message.type === 'error'
                            })}>
                                {message.text}
                            </span>
                        )}

                        <Button
                            type="button"
                            variant="secondary"
                            style={{ fontSize: '0.8rem' }}
                            onClick={() => setShowResetModal(true)}
                        >
                            Zmeniť heslo
                        </Button>
                    </div>

                    <Modal
                        isOpen={showResetModal}
                        onClose={() => setShowResetModal(false)}
                        title="Obnovenie hesla"
                        actions={
                            <>
                                <Button variant="ghost" onClick={() => setShowResetModal(false)}>
                                    Zrušiť
                                </Button>
                                <form action={handleResetPassword}>
                                    <Button type="submit" variant="primary">
                                        Odoslať email
                                    </Button>
                                </form>
                            </>
                        }
                    >
                        <p>Naozaj chcete odoslať e-mail s inštrukciami na obnovenie hesla na adresu <strong>{user.email}</strong>?</p>
                    </Modal>
                </div>
            </div>

            {/* Voucher Card */}
            {user.role !== 'employee' && (
                <div className={styles.card}>
                    <h3 className={styles.title}>Uplatniť darčekový voucher</h3>
                    <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Máte darčekový kód? Zadajte ho nižšie a vstupy sa Vám automaticky pripočítajú.
                    </p>
                    <form onSubmit={handleRedeemVoucher} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Zadajte kód (napr. ABC123ZY)"
                                className={styles.input}
                                value={voucherCode}
                                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                                style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}
                            />
                            {voucherMessage && (
                                <div className={clsx(styles.message, {
                                    [styles.success]: voucherMessage.type === 'success',
                                    [styles.error]: voucherMessage.type === 'error'
                                })} style={{ marginTop: '0.5rem', display: 'block' }}>
                                    {voucherMessage.text}
                                </div>
                            )}
                        </div>
                        <Button type="submit" variant="primary" disabled={paramVoucherLoading || !voucherCode}>
                            {paramVoucherLoading ? 'Overujem...' : 'Uplatniť'}
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}
