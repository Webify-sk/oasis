'use client';

import clsx from 'clsx';
import { Button } from '@/components/ui/Button';
import styles from './CreditPackages.module.css';
import { createCheckoutSession } from '@/app/actions/stripe';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PackageId } from '@/lib/constants/creditPackages';

const packages = [
    {
        id: 'intro',
        name: 'Oasis Intro Pass',
        credits: '1 vstup',
        description: 'Vyskúšajte atmosféru Oasis Lounge. Ideálne pre prvú návštevu.',
        validity: 'Platnosť 1 mesiac',
        price: '27 €',
        priceDetail: 'Jednorazový vstup',
        highlight: false,
    },
    {
        id: 'flow',
        name: 'Oasis Flow Pass',
        credits: '5 vstupov',
        description: 'Pre tých, ktorí chcú zaradiť pohyb do svojho života.',
        validity: 'Platnosť 2 mesiace',
        price: '125 €',
        priceDetail: '25 € / vstup',
        highlight: false,
    },
    {
        id: 'core',
        name: 'Oasis Core Pass',
        credits: '10 vstupov',
        description: 'Náš najobľúbenejší balíček pre pravidelný tréning.',
        validity: 'Platnosť 4 mesiace',
        price: '230 €',
        priceDetail: '23 € / vstup',
        highlight: true,
    },
    {
        id: 'balance',
        name: 'Oasis Balance Builder',
        credits: '25 vstupov',
        description: 'Maximálna flexibilita a najlepšia cena za vstup pre odhodlaných. Platnosť 9 mesiacov.',
        validity: 'Platnosť 9 mesiacov',
        price: '500 €',
        priceDetail: '20 € / vstup',
        highlight: false,
    },
    {
        id: 'unlimited',
        name: 'Oasis Unlimited',
        credits: 'Neobmedzený',
        description: 'Jeden rok neobmedzeného pohybu a relaxu. Movement Pass.',
        validity: 'Platnosť 1 rok',
        price: '2500 €',
        priceDetail: 'Movement Pass',
        highlight: false,
    },
    {
        id: 'private',
        name: 'Private Experience',
        credits: 'Individuálny',
        description: 'Osobný prístup s trénerom pre maximálne výsledky.',
        validity: 'Na dohodu',
        price: 'od 60 €',
        priceDetail: '1 os. 60€ / 2 os. 100€',
        highlight: false,
    }
];

export function CreditPackages() {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleBuy = async (pkg: typeof packages[0]) => {
        try {
            setLoadingId(pkg.id);
            // Skip checkout for "Private Experience" which has variable pricing "od 60 €"
            if (pkg.id === 'private') {
                // Maybe redirect to contact or booking? For now, alert
                alert('Pre individuálny tréning nás prosím kontaktujte.');
                return;
            }

            const result = await createCheckoutSession(pkg.id as PackageId, pkg.price, pkg.name) as any;

            if (result && result.error) {
                alert(`Chyba: ${result.error}`);
                setLoadingId(null);
                return;
            }

            if (result && result.url) {
                window.location.href = result.url;
            }
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Nastala chyba pri vytváraní objednávky. Skúste to prosím neskôr.');
        } finally {
            // Don't clear loading state if redirecting, to prevent flash
            // setLoadingId(null); 
            // actually, better to keep it loading until page unloads
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Vyberte si z dostupných možností</h3>
                <p>
                    Zvoľte si balíček, ktorý najviac vyhovuje vašim potrebám.
                    Po zakúpení sa vstupy automaticky pripočítajú na váš účet a môžete ich ihneď využiť na rezerváciu termínov.
                </p>
            </div>

            <div className={styles.grid}>
                {packages.map((pkg) => (
                    <div key={pkg.id} className={clsx(styles.card, { [styles.highlightCard]: pkg.highlight })}>
                        {pkg.highlight && <div className={styles.badge}>Doporučujeme</div>}

                        <div>
                            <div className={styles.cardHeader}>
                                <h4 className={styles.cardTitle}>{pkg.name}</h4>
                                <span className={styles.creditsCount}>{pkg.credits}</span>
                            </div>
                            <p className={styles.cardDesc}>{pkg.description}</p>
                            <div className={styles.cardValidity}>{pkg.validity}</div>
                        </div>

                        <div className={styles.cardFooter}>
                            <div className={styles.priceContainer}>
                                <span className={styles.priceDetail}>{pkg.priceDetail}</span>
                                <span className={styles.price}>{pkg.price}</span>
                            </div>
                            <Button
                                className={clsx(styles.buyButton, { [styles.highlightButton]: pkg.highlight })}
                                onClick={() => handleBuy(pkg)}
                                disabled={loadingId !== null}
                            >
                                {loadingId === pkg.id && <Loader2 className="animate-spin" size={16} style={{ marginRight: '8px' }} />}
                                {loadingId === pkg.id ? 'SPRACOVÁVA SA...' : 'ZAKÚPIŤ'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
