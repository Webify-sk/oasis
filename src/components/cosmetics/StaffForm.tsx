'use client';

import { useState, useActionState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createEmployee, updateEmployee, updateEmployeeServices, getCosmeticServices, getEmployeeServices } from '@/actions/cosmetic-actions';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Employee {
    id: string;
    name: string;
    bio: string | null;
    color: string | null;
    is_active: boolean;
}

interface Service {
    id: string;
    title: string;
}

const initialState = {
    message: null as string | null,
};

export function StaffForm({ initialData }: { initialData?: Employee }) {
    const router = useRouter();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Determine which action to use (create or update)
    // Note: This is slightly more complex here because we need to handle services separately for update
    // For create: We just create the employee. Services are added in edit mode for now (MVP simplification mentioned in Manager).
    // actually, let's try to do it properly: create -> redirect -> edit OR handle services in create too if possible.
    // The previous implementation for create said: "// Note: For MVP we don't link services on create yet (UI simplification)."
    // We will stick to that or improve it. Let's improve it:
    // Actually, createEmployee only takes formData. We'd need to modify the action to take services or do two calls.
    // To match the previous logic exactly: 
    // Create: call createEmployee.
    // Update: call updateEmployee AND updateEmployeeServices.

    useEffect(() => {
        // Fetch services list
        getCosmeticServices().then(data => setServices(data as Service[]));

        // If editing, fetch employee's services
        if (initialData?.id) {
            getEmployeeServices(initialData.id).then(ids => setSelectedServiceIds(ids));
        }
    }, [initialData]);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            if (initialData?.id) {
                // UPDATE
                await updateEmployee(initialData.id, formData);
                await updateEmployeeServices(initialData.id, selectedServiceIds);
            } else {
                // CREATE
                await createEmployee(formData);
                // Note: Services currently ignored on create as per original logic, 
                // but since we are on a dedicated page now, we could theoretically do it. 
                // However, let's stick to safe path: Create creates the record, user can then edit to add services if needed, 
                // OR we'd need to update the create action.
                // Given "UI simplification" comment, let's assume create action doesn't handle services yet.
                // If the user selects services on create, they might be lost with current actions.
                // Let's rely on the fact that existing logic was: Create -> (Close Modal) -> User clicks Edit to add services.
                // We can improve this: After create, if services selected, we could try to verify ID? 
                // But createEmployee doesn't return ID easily in the formAction pattern without changes.
                // So for Create, we will hide Service selection to avoid confusion, OR show it but warn it's for edit only? 
                // Better: Just hide Service selection for Create mode to match original MVP logic.
            }
            router.push('/admin/cosmetics/staff');
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Nastala chyba.');
        } finally {
            setLoading(false);
        }
    };

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/admin/cosmetics/staff" style={{ display: 'inline-flex', alignItems: 'center', color: '#666', textDecoration: 'none', marginBottom: '1rem', fontSize: '0.9rem' }}>
                    <ChevronLeft size={16} style={{ marginRight: '0.25rem' }} />
                    Späť na zoznam
                </Link>
                <h1 style={{ fontFamily: 'serif', fontSize: '2rem', color: '#2c3e50', margin: 0 }}>
                    {initialData ? 'Upraviť zamestnanca' : 'Nový zamestnanec'}
                </h1>
            </div>

            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', border: '1px solid #E5E0DD', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>

                <form action={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Meno</label>
                        <input
                            name="name"
                            defaultValue={initialData?.name}
                            required
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Bio / Popis</label>
                        <textarea
                            name="bio"
                            defaultValue={initialData?.bio || ''}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px', fontFamily: 'inherit' }}
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Farba</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="color"
                                name="color"
                                defaultValue={initialData?.color || '#5E715D'}
                                style={{ width: '60px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                            />
                        </div>
                    </div>

                    {/* Service Selection - Only visible when editing to match original logic */}
                    {initialData && (
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1rem', fontWeight: 'bold', color: '#2c3e50' }}>
                                Priradené služby
                            </label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '0.75rem',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                border: '1px solid #f0f0f0',
                                padding: '1rem',
                                borderRadius: '4px',
                                backgroundColor: '#fafafa'
                            }}>
                                {services.length === 0 ? (
                                    <p style={{ color: '#888', fontSize: '0.8rem' }}>Žiadne služby sa nenašli. Najprv vytvorte službu.</p>
                                ) : (
                                    services.map(service => (
                                        <div key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem' }}>
                                            <input
                                                type="checkbox"
                                                id={`service-${service.id}`}
                                                checked={selectedServiceIds.includes(service.id)}
                                                onChange={() => toggleService(service.id)}
                                                style={{ cursor: 'pointer', width: '1rem', height: '1rem', accentColor: '#5E715D' }}
                                            />
                                            <label htmlFor={`service-${service.id}`} style={{ fontSize: '0.9rem', cursor: 'pointer' }}>{service.title}</label>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '1rem', border: '1px solid #f0f0f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fafafa' }}>
                            <input
                                type="checkbox"
                                name="is_active"
                                id="is_active_emp"
                                defaultChecked={initialData ? initialData.is_active : true}
                                style={{ width: '1.2rem', height: '1.2rem', accentColor: '#5E715D' }}
                            />
                            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#333' }}>Aktívny</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <Link href="/admin/cosmetics/staff">
                            <Button type="button" variant="ghost">Zrušiť</Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{
                                backgroundColor: '#5E715D',
                                color: 'white',
                                padding: '0.75rem 2rem'
                            }}
                        >
                            {loading ? 'Ukladám...' : (initialData ? 'Uložiť zmeny' : 'Vytvoriť zamestnanca')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
