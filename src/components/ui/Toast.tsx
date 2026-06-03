'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 4000 }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: 'white',
            color: '#333',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderLeft: `4px solid ${type === 'success' ? '#10b981' : '#ef4444'}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            fontFamily: 'var(--font-geist-sans)'
        }}>
            {type === 'success' ? <CheckCircle color="#10b981" size={24} /> : <XCircle color="#ef4444" size={24} />}
            <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{message}</span>
            <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.5rem', color: '#9ca3af', display: 'flex' }}>
                <X size={18} />
            </button>
        </div>
    );
}
