'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ExpiredCreditsPopupProps {
    userId: string;
    hasExpired: boolean;
}

export function ExpiredCreditsPopup({ userId, hasExpired }: ExpiredCreditsPopupProps) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!hasExpired) return;

        const storageKey = `oasis_expired_credits_seen_${userId}`;
        const hasSeen = localStorage.getItem(storageKey);

        if (!hasSeen) {
            setIsOpen(true);
            localStorage.setItem(storageKey, 'true');
        }
    }, [userId, hasExpired]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '400px',
                width: '100%',
                position: 'relative',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                textAlign: 'center'
            }}>
                <button 
                    onClick={() => setIsOpen(false)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                >
                    <X size={20} />
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#ef4444' }}>
                    <AlertCircle size={48} />
                </div>
                
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>
                    Platnosť Vašich kreditov vypršala
                </h2>
                
                <p style={{ color: '#4b5563', marginBottom: '2rem', lineHeight: 1.5 }}>
                    Dovoľujeme si Vás informovať, že platnosť Vašich starých zakúpených kreditov uplynula na základe podmienok dĺžky platnosti vstupov (1 až 12 mesiacov podľa zakúpeného balíčka).
                </p>
                
                <Button 
                    onClick={() => setIsOpen(false)} 
                    style={{ width: '100%', backgroundColor: '#5E715D', color: 'white' }}
                >
                    Rozumiem
                </Button>
            </div>
        </div>
    );
}
