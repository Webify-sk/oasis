import { createClient } from '@/utils/supabase/server';
import { TrainerForm } from '@/components/admin/TrainerForm';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function NewTrainerPage() {
    // Existing trainers who cannot log in yet. Creating a second record for one of them
    // splits the schedule from the login, so offer the existing record first.
    const supabase = await createClient();
    const { data: withoutAccount } = await supabase
        .from('trainers')
        .select('id, full_name')
        .is('profile_id', null)
        .order('full_name');

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <Link
                href="/admin/trainers"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#666',
                    marginBottom: '2rem',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}
            >
                <ChevronLeft size={20} />
                Späť na zoznam
            </Link>

            {withoutAccount && withoutAccount.length > 0 && (
                <div style={{
                    backgroundColor: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412',
                    borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.92rem', lineHeight: 1.55
                }}>
                    <strong>Ide o trénera, ktorý už v systéme je?</strong> Títo tréneri zatiaľ nemajú prihlasovací účet.
                    Ak chcete niektorému z nich vytvoriť účet, otvorte jeho záznam a doplňte e-mail a heslo —
                    nevytvárajte nového trénera, inak by sa mu po prihlásení nezobrazil rozvrh.
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {withoutAccount.map(t => (
                            <Link key={t.id} href={`/admin/trainers/${t.id}`} style={{
                                backgroundColor: 'white', border: '1px solid #FED7AA', borderRadius: '999px',
                                padding: '0.3rem 0.8rem', color: '#9A3412', textDecoration: 'none', fontWeight: 600
                            }}>
                                {t.full_name.trim()}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <TrainerForm />
        </div>
    );
}
