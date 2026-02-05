'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { login, signup, resetPassword } from '@/app/auth/actions'; // Import resetPassword
import { Loader2, Eye, EyeOff } from 'lucide-react';

/* Reusing the simple Input from page.tsx but making it exportable/internal */
function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className="input-focus-bloom"
            style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid #E5E0DD',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                ...props.style
            }}
        />
    )
}

export function AuthForm() {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        date_of_birth: '',
        email: ''
    });

    useEffect(() => {
        const savedData = localStorage.getItem('registration_draft');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error("Failed to parse saved registration data", e);
            }
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Only persist non-sensitive data
        if (['full_name', 'date_of_birth', 'email'].includes(name)) {
            const updatedData = { ...formData, [name]: value };
            setFormData(updatedData);
            localStorage.setItem('registration_draft', JSON.stringify(updatedData));
        }
    };

    // Wrapper to handle loading state and validation
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const submitData = new FormData(form);

        setError(null);
        setSuccessMessage(null);
        setIsLoading(true);

        const password = submitData.get('password') as string;

        try {
            if (mode === 'register') {
                const confirmPassword = submitData.get('confirmPassword') as string;

                if (password.length < 6) {
                    setError('Heslo musí mať minimálne 6 znakov.');
                    setIsLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setError('Heslá sa nezhodujú.');
                    setIsLoading(false);
                    return;
                }

                const result = await signup(submitData);
                if (result?.error) {
                    setError(result.error);
                } else {
                    // Success - clear draft
                    localStorage.removeItem('registration_draft');
                }
            } else if (mode === 'login') {
                const result = await login(submitData);
                if (result?.error) {
                    setError(result.error);
                }
            } else if (mode === 'forgot-password') {
                const email = submitData.get('email') as string;
                const result = await resetPassword(email);
                if (!result.success) {
                    setError(result.message);
                } else {
                    setSuccessMessage(result.message);
                }
            }
        } catch (e: any) {
            // Fix: Ignore the NEXT_REDIRECT error thrown by Next.js redirect()
            if (e.message === 'NEXT_REDIRECT' || e?.digest?.includes('NEXT_REDIRECT')) {
                return;
            }
            // Error is usually handled by redirect in action, but safety net
            console.error(e);
            setError('Nastala neočakávaná chyba. Skúste to prosím neskôr.');
        } finally {
            // Only stop loading if NOT redirecting (if redirecting, we want to keep loading state until page change)
            // Check if it was a redirect error from the catch above? No, clean way:
            // If we caught an error that ISN'T redirect, we stop loading.
            // If we didn't catch anything, we MIGHT be redirecting if the action returned void?
            // Actually, in the catch block we returned for redirect.
            // So this finally block runs always.
            // We should NOT stop loading if redirecting to avoid UI jerkiness.
            // But checking 'e' here is hard.
            // Let's rely on component unmount or just accept a brief spinner stop.
            // Better: Move setIsLoading(false) to the error paths within logic, or checking a flag.

            // Simplified approach for now:
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);
    const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

    // Determine title based on mode
    let title = 'Vitajte';
    if (mode === 'register') title = 'Registrácia';
    if (mode === 'forgot-password') title = 'Obnova hesla';

    // Determine button text based on mode
    let buttonText = 'Prihlásiť sa';
    if (mode === 'register') buttonText = 'Vytvoriť účet';
    if (mode === 'forgot-password') buttonText = 'Odoslať link na obnovu';

    return (
        <form onSubmit={handleSubmit} className="animate-fadeInUp" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            backgroundColor: '#fff',
            padding: '3rem',
            borderRadius: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
            border: '1px solid #E5E0DD',
            animationDuration: '0.8s' /* Slightly slower for elegance */
        }}>
            <h3 style={{ fontFamily: 'serif', fontSize: '1.5rem', marginBottom: '1rem', color: '#4A403A' }}>
                {title}
            </h3>

            {error && (
                <div style={{ color: '#dc2626', fontSize: '0.9rem', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '4px' }}>
                    {error}
                </div>
            )}

            {successMessage && (
                <div style={{ color: '#059669', fontSize: '0.9rem', backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '4px' }}>
                    {successMessage}
                </div>
            )}

            {mode === 'register' && (
                <>
                    <Input
                        name="full_name"
                        type="text"
                        placeholder="Meno a Priezvisko"
                        required
                        value={formData.full_name}
                        onChange={handleChange}
                    />
                    <Input
                        name="date_of_birth"
                        type="date"
                        placeholder="Dátum narodenia"
                        required
                        style={{ fontFamily: 'inherit' }}
                        value={formData.date_of_birth}
                        onChange={handleChange}
                    />
                </>
            )}

            <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                value={formData.email}
                onChange={handleChange}
            />

            {mode !== 'forgot-password' && (
                <div style={{ position: 'relative' }}>
                    <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Heslo"
                        required
                        style={{ marginBottom: mode === 'register' ? '1rem' : '1rem' }}
                    />
                    <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '12px', // Adjusted for padding
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9CA3AF'
                        }}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            )}

            {mode === 'register' && (
                <div style={{ position: 'relative' }}>
                    <Input
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Zopakujte heslo"
                        required
                    />
                    <button
                        type="button"
                        onClick={toggleConfirmPasswordVisibility}
                        style={{
                            position: 'absolute',
                            right: '10px',
                            top: '12px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#9CA3AF'
                        }}
                    >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
            )}

            <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{ width: '100%', justifyContent: 'center' }}
            >
                {isLoading && <Loader2 className="animate-spin" size={20} style={{ marginRight: '8px' }} />}
                {buttonText}
            </Button>

            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
                {mode === 'login' ? (
                    <>
                        Nemáte účet?{' '}
                        <button
                            type="button"
                            onClick={() => { setMode('register'); setError(null); setSuccessMessage(null); }}
                            style={{ background: 'none', border: 'none', color: '#8C7568', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                        >
                            Registrovať sa
                        </button>
                    </>
                ) : mode === 'register' ? (
                    <>
                        Už máte účet?{' '}
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                            style={{ background: 'none', border: 'none', color: '#8C7568', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                        >
                            Prihlásiť sa
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                        style={{ background: 'none', border: 'none', color: '#8C7568', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                    >
                        Späť na prihlásenie
                    </button>
                )}
            </div>

            {mode === 'login' && (
                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => { setMode('forgot-password'); setError(null); setSuccessMessage(null); }}
                        style={{ background: 'none', border: 'none', textDecoration: 'underline', color: '#aaa', cursor: 'pointer' }}
                    >
                        Zabudli ste heslo?
                    </button>
                </p>
            )}
        </form>
    );
}
