'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, Menu, X } from 'lucide-react';
import styles from './Header.module.css';
import clsx from 'clsx';

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

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

                {/* Hamburger Button (Mobile Only) */}
                <button
                    className={styles.hamburger}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                {/* Navigation Links */}
                <nav className={clsx(styles.nav, { [styles.navOpen]: isMenuOpen })}>
                    <ul className={styles.navList}>
                        <li><Link href="/#services" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Naše služby</Link></li>
                        <li><Link href="/#trainers" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Tréneri</Link></li>
                        <li><Link href="/#about" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>O štúdiu</Link></li>
                        <li><Link href="/#gallery" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Galéria</Link></li>
                        <li><Link href="/#contact" className={styles.navLink} onClick={() => setIsMenuOpen(false)}>Kontakt</Link></li>
                    </ul>
                </nav>

                {/* User Actions */}
                <div className={styles.userActions}>
                    <Link href="/dashboard/profile" className={styles.profileLink}>
                        <User size={20} />
                        <span className={styles.profileText}>Môj profil</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
