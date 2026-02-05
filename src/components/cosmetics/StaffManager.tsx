'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, User, Calendar } from 'lucide-react';
import { createEmployee, updateEmployee, deleteEmployee, getCosmeticServices, getEmployeeServices, updateEmployeeServices } from '@/actions/cosmetic-actions';

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

export function StaffManager({ initialEmployees }: { initialEmployees: Employee[] }) {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch all services for the selection list
        getCosmeticServices().then(data => setServices(data as Service[]));
    }, []);

    const handleCreate = async (formData: FormData) => {
        setLoading(true);
        // Create employee first
        await createEmployee(formData);
        // Note: For MVP we don't link services on create yet (UI simplification).
        // User creates employee, then edits to add services.
        setLoading(false);
        setIsModalOpen(false);
        window.location.reload();
    };

    const handleUpdate = async (formData: FormData) => {
        if (!editingEmployee) return;
        setLoading(true);

        // 1. Update basic info
        await updateEmployee(editingEmployee.id, formData);

        // 2. Update services
        await updateEmployeeServices(editingEmployee.id, selectedServiceIds);

        setLoading(false);
        setEditingEmployee(null);
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Naozaj chcete vymazať tohto zamestnanca?')) {
            await deleteEmployee(id);
            window.location.reload();
        }
    };

    const openCreateModal = () => {
        setEditingEmployee(null);
        setSelectedServiceIds([]);
        setIsModalOpen(true);
    };

    const openEditModal = async (employee: Employee) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
        // Fetch current services for this employee
        const serviceIds = await getEmployeeServices(employee.id);
        setSelectedServiceIds(serviceIds);
    };

    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '500' }}>Zoznam zamestnancov</h2>
                <button
                    onClick={openCreateModal}
                    className="button"
                    style={{
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
                </button>
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
                            <button
                                onClick={() => openEditModal(employee)}
                                style={{
                                    padding: '0.6rem',
                                    background: 'white',
                                    border: '1px solid #ddd',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    color: '#555'
                                }}
                                title="Upraviť detaily"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(employee.id)}
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

            {/* Modal */}
            {(isModalOpen || editingEmployee) && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => { setIsModalOpen(false); setEditingEmployee(null); }}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <h2 style={{ marginTop: 0, marginBottom: '1.5rem' }}>
                            {editingEmployee ? 'Upraviť zamestnanca' : 'Nový zamestnanec'}
                        </h2>

                        <form action={editingEmployee ? handleUpdate : handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Meno</label>
                                <input
                                    name="name"
                                    defaultValue={editingEmployee?.name}
                                    required
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Bio / Popis</label>
                                <textarea
                                    name="bio"
                                    defaultValue={editingEmployee?.bio || ''}
                                    style={{ width: '100%', padding: '0.8rem', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Farba</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="color"
                                        name="color"
                                        defaultValue={editingEmployee?.color || '#5E715D'}
                                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>

                            {/* Service Selection - Only visible when editing */}
                            {editingEmployee && (
                                <div style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                        Priradené služby
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid #f0f0f0', padding: '0.5rem', borderRadius: '4px' }}>
                                        {services.length === 0 ? (
                                            <p style={{ color: '#888', fontSize: '0.8rem' }}>Žiadne služby sa nenašli. Najprv vytvorte službu.</p>
                                        ) : (
                                            services.map(service => (
                                                <div key={service.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        id={`service-${service.id}`}
                                                        checked={selectedServiceIds.includes(service.id)}
                                                        onChange={() => toggleService(service.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor={`service-${service.id}`} style={{ fontSize: '0.9rem', cursor: 'pointer' }}>{service.title}</label>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    id="is_active_emp"
                                    defaultChecked={editingEmployee ? editingEmployee.is_active : true}
                                />
                                <label htmlFor="is_active_emp">Aktívny</label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="button"
                                style={{
                                    marginTop: '1rem',
                                    backgroundColor: '#5E715D',
                                    color: 'white',
                                    padding: '1rem',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading ? 'Ukladám...' : (editingEmployee ? 'Uložiť zmeny' : 'Pridať zamestnanca')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
