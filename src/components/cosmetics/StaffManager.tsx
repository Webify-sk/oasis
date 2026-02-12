'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, User, Calendar, Eye } from 'lucide-react';
import { deleteEmployee } from '@/actions/cosmetic-actions';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import Link from 'next/link';
import buttonStyles from '@/components/ui/Button.module.css';
import clsx from 'clsx';

interface Employee {
    id: string;
    name: string;
    bio: string | null;
    color: string | null;
    is_active: boolean;
}

export function StaffManager({ initialEmployees }: { initialEmployees: Employee[] }) {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteEmployee(deleteId);
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Chyba pri mazaní.');
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'normal', fontFamily: 'serif', color: '#93745F', margin: 0 }}>Zoznam zamestnancov</h1>
                <Link
                    href="/admin/cosmetics/staff/new"
                    className="button"
                    style={{
                        textDecoration: 'none',
                        backgroundColor: '#5E715D',
                        color: 'white',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <Plus size={18} />
                    Pridať zamestnanca
                </Link>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {employees.map((employee) => (
                    <div key={employee.id} style={{
                        backgroundColor: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #eef0ee',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {/* Avatar */}
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: employee.color || '#5E715D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                flexShrink: 0,
                                boxShadow: `0 4px 10px ${employee.color ? employee.color + '40' : 'rgba(94, 113, 93, 0.2)'}`
                            }}>
                                <User size={32} />
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.1rem', fontWeight: '600' }}>{employee.name}</h3>
                                    {!employee.is_active && (
                                        <span style={{ fontSize: '0.7rem', color: '#999', backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>Neaktívny</span>
                                    )}
                                </div>
                                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: employee.is_active ? '#4caf50' : '#cfd8dc' }} />
                                    <span style={{ fontSize: '0.8rem', color: '#777' }}>{employee.is_active ? 'Available for booking' : 'Currenly unavailable'}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: '1.5', flex: 1 }}>
                            {employee.bio || <span style={{ color: '#ccc', fontStyle: 'italic' }}>Bez biografie</span>}
                        </div>

                        <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                            <a
                                href={`/admin/cosmetics/staff/${employee.id}/availability`}
                                className="button-secondary"
                                style={{
                                    flex: 1,
                                    padding: '0.6rem',
                                    background: '#f0f7f0',
                                    border: '1px solid #aebcb0',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#3d4f3e',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                <Calendar size={16} /> Dostupnosť
                            </a>
                            <Link
                                href={`/admin/cosmetics/staff/${employee.id}`}
                                className={clsx(buttonStyles.button, buttonStyles.secondary, buttonStyles.sm)}
                                style={{
                                    textDecoration: 'none',
                                    flex: 'none',
                                    padding: '0.6rem 0.8rem',
                                    height: 'auto',
                                    backgroundColor: 'white',
                                    border: '1px solid #ddd',
                                    color: '#555',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    boxShadow: 'none'
                                }}
                                title="Zobraziť detail"
                            >
                                <Eye size={16} />
                                Detail
                            </Link>
                            <button
                                onClick={() => handleDeleteClick(employee.id)}
                                style={{
                                    padding: '0.6rem',
                                    background: '#fff5f5',
                                    border: '1px solid #ffcdd2',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#c62828'
                                }}
                                title="Vymazať"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                title="Zmazať zamestnanca"
                actions={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteId(null)} disabled={isDeleting}>
                            Zrušiť
                        </Button>
                        <Button
                            variant="primary"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            style={{ backgroundColor: '#dc2626', color: 'white' }}
                        >
                            {isDeleting ? 'Mažem...' : 'Zmazať'}
                        </Button>
                    </>
                }
            >
                <p>Naozaj chcete vymazať tohto zamestnanca? Táto akcia je nevratná.</p>
            </Modal>
        </div>
    );
}
