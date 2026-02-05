'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, Menu, X } from 'lucide-react';
import styles from './Header.module.css';
import clsx from 'clsx';

export function Header() {
    return (
        <header className={styles.header}>
            <div className={styles.container}>
                {/* Logo */}
                <div className={styles.logo}>
                    <Link href="/dashboard" className={styles.logoLink}>
                        <Image
                            src="/logo-new.png"
                            alt="Oasis Lounge"
                            width={180}
                            height={50}
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </Link>
                </div>

                {/* Right Side Actions */}
                <div className={styles.userActions} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Return to Web CTA */}
                    <Link href="/" style={{
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: '#5E715D',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid transparent',
                        transition: 'border-color 0.2s'
                    }} className="hover:border-current">
                        Návrat na web
                    </Link>

                </div>
            </div>
        </header>
    );
}
