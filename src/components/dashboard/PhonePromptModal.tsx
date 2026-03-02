'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface PhonePromptModalProps {
    isPhoneMissing: boolean;
    userId: string;
}

export function PhonePromptModal({ isPhoneMissing, userId }: PhonePromptModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Only show if phone is missing
        if (!isPhoneMissing) return;

        // Check session storage to only show once per session for this user
        const storageKey = `phonePromptSeen_${userId}`;
        const hasSeenPrompt = sessionStorage.getItem(storageKey);

        if (!hasSeenPrompt) {
            setIsOpen(true);
            sessionStorage.setItem(storageKey, 'true');
        }
    }, [isPhoneMissing, userId]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleAddPhone = () => {
        setIsOpen(false);
        router.push('/dashboard/profile');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Dôležité"
            titleAlign="left"
            actions={
                <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-start' }}>
                    <Button variant="primary" onClick={handleAddPhone}>
                        Doplniť číslo
                    </Button>
                    <Button variant="secondary" onClick={handleClose}>
                        Neskôr
                    </Button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p>
                    Prosíme o doplnenie vášho telefónneho čísla, aby sme vás mohli včas kontaktovať v prípade zrušenia tréningu, zmeny jeho času alebo zmeny rezervovaného termínu ošetrenia.
                </p>
                <p>
                    Ďakujeme za pochopenie a spoluprácu.
                </p>
            </div>
        </Modal>
    );
}
