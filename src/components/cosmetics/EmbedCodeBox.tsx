'use client';

import { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';

/**
 * Shows the ready-made snippet for embedding this procedure's public calendar
 * into the WordPress page, so nobody has to dig the service id out of the database.
 */
export function EmbedCodeBox({ serviceId, serviceTitle }: { serviceId: string; serviceTitle?: string }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';
    const snippet =
        `<iframe src="${baseUrl}/cosmetics/embed?sluzba=${serviceId}"\n` +
        `        class="oasis-terminy" style="width:100%;border:0" height="760"\n` +
        `        title="Voľné termíny${serviceTitle ? ' – ' + serviceTitle : ''}"></iframe>`;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            alert('Kopírovanie sa nepodarilo, označte kód myšou a skopírujte ručne.');
        }
    };

    return (
        <div style={{ marginTop: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.9rem 1rem', backgroundColor: '#f9fafb', border: 'none',
                    cursor: 'pointer', fontWeight: 600, color: '#374151', fontSize: '0.95rem'
                }}
            >
                <Code size={16} /> Kód pre web
                <span style={{ marginLeft: 'auto', color: '#9ca3af', fontWeight: 400, fontSize: '0.85rem' }}>
                    {open ? 'skryť' : 'zobraziť'}
                </span>
            </button>

            {open && (
                <div style={{ padding: '1rem', backgroundColor: 'white' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.5 }}>
                        Tento kód vložte na stránku procedúry na webe. Zobrazí sa kalendár s voľnými
                        termínmi len pre túto procedúru.
                    </p>
                    <pre style={{
                        margin: 0, padding: '0.9rem', backgroundColor: '#f9fafb',
                        border: '1px solid #f0f0f0', borderRadius: '8px', overflowX: 'auto',
                        fontSize: '0.78rem', lineHeight: 1.5, color: '#111827'
                    }}>{snippet}</pre>
                    <button
                        type="button"
                        onClick={copy}
                        style={{
                            marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #e5e7eb',
                            backgroundColor: copied ? '#ecfdf5' : 'white',
                            color: copied ? '#065f46' : '#374151',
                            cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500
                        }}
                    >
                        {copied ? <><Check size={15} /> Skopírované</> : <><Copy size={15} /> Skopírovať kód</>}
                    </button>
                </div>
            )}
        </div>
    );
}
