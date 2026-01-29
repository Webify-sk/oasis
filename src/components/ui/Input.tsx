import React, { InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: LucideIcon;
}

export function Input({ label, icon: Icon, className, ...props }: InputProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {label && (
                <label style={{ fontSize: '0.875rem', color: '#4A403A', fontWeight: 500 }}>
                    {label} {props.required && <span style={{ color: '#E53E3E' }}>*</span>}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                {Icon && (
                    <div style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8D8D8D',
                        pointerEvents: 'none'
                    }}>
                        <Icon size={18} />
                    </div>
                )}
                <input
                    style={{
                        width: '100%',
                        padding: Icon ? '0.75rem 1rem 0.75rem 2.5rem' : '0.75rem 1rem',
                        border: '1px solid #E5E0DD',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        color: '#4A403A',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: props.disabled ? '#F9FAFB' : '#fff',
                        cursor: props.disabled ? 'not-allowed' : 'text'
                    }}
                    {...props}
                />
            </div>
        </div>
    );
}
