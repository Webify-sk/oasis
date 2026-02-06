'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createUser } from '../actions';
import Link from 'next/link';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';

export default function NewUserPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        setMessage(null);

        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setMessage('Heslá sa nezhodujú.');
            setIsLoading(false);
            return;
        }

        const res = await createUser(null, formData);

        if (res?.message) {
            setMessage(res.message);
            setIsLoading(false);
        }
        // If success, it redirects.
    };

    return (
        <div style={{ padding: '0rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '2rem',
                padding: '2rem 2rem 0 2rem',
                gap: '1rem'
            }}>
                <Link href="/admin/users" style={{ color: '#4A403A', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={24} />
                </Link>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif' }}>Pridať užívateľa</h1>
            </div>

            <div style={{ padding: '0 2rem' }}>
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: '3rem',
                    border: '1px solid #E5E0DD',
                    maxWidth: '800px'
                }}>
                    <form action={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                            <div style={{ paddingBottom: '2rem', borderBottom: '1px solid #eee', gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>PRIHLASOVACIE ÚDAJE</label>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>E-mail *</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="email@example.com"
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                />
                            </div>

                            {/* Password Fields Wrapper */}
                            <div style={{ display: 'grid', gridColumn: 'span 2', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Heslo *</label>
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="Min. 6 znakov"
                                        minLength={6}
                                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '35px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Potvrdenie hesla *</label>
                                    <input
                                        name="confirmPassword"
                                        type={showConfirm ? "text" : "password"}
                                        required
                                        placeholder="Zopakujte heslo"
                                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        style={{ position: 'absolute', right: '10px', top: '35px', background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                    >
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ paddingBottom: '2rem', borderBottom: '1px solid #eee', gridColumn: 'span 2', marginTop: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>OSOBNÉ ÚDAJE</label>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Meno a priezvisko</label>
                                <input
                                    name="full_name"
                                    placeholder="Ján Novák"
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Telefón</label>
                                <input
                                    name="phone"
                                    placeholder="+421 900 000 000"
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Vstupy</label>
                                <input
                                    name="credits"
                                    type="number"
                                    defaultValue="0"
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>Rola</label>
                                <select
                                    name="role"
                                    defaultValue="user"
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E0DD', borderRadius: '4px', backgroundColor: '#fff' }}
                                >
                                    <option value="user">Užívateľ</option>
                                    <option value="trainer">Tréner</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {message && (
                            <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', color: '#991B1B', marginBottom: '2rem', borderRadius: '4px', fontSize: '0.9rem' }}>
                                {message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <Link href="/admin/users">
                                <Button type="button" variant="ghost">Zrušiť</Button>
                            </Link>
                            <Button type="submit" variant="primary" disabled={isLoading}>
                                {isLoading ? 'Vytváram...' : 'Vytvoriť užívateľa'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
