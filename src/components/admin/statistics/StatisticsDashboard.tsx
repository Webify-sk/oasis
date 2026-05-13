'use client';

import React, { useState, useMemo } from 'react';
import { StatItem } from '@/actions/statistics-actions';
import { Search, Calendar, Filter, Download, User, BarChart2, Table } from 'lucide-react';
import clsx from 'clsx';
import { isWithinInterval, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { sk } from 'date-fns/locale';

interface StatisticsDashboardProps {
    initialItems: StatItem[];
}

export default function StatisticsDashboard({ initialItems }: StatisticsDashboardProps) {
    const [items] = useState<StatItem[]>(initialItems);
    const [activeTab, setActiveTab] = useState<'overview' | 'table'>('overview');

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'training' | 'procedure'>('all');
    const [personFilter, setPersonFilter] = useState<string>('all');

    // Date filtering
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // Pagination for table
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Unique persons for filter
    const uniquePersons = useMemo(() => {
        const persons = new Set<string>();
        items.forEach(item => {
            if (item.personName) persons.add(item.personName);
        });
        return Array.from(persons).sort();
    }, [items]);

    const filteredItems = useMemo(() => {
        setCurrentPage(1); // Reset pagination on filter change
        return items.filter(item => {
            // Type
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;

            // Person
            if (personFilter !== 'all' && item.personName !== personFilter) return false;

            // Search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (
                    !item.title.toLowerCase().includes(term) &&
                    !item.customerName.toLowerCase().includes(term) &&
                    !item.personName.toLowerCase().includes(term)
                ) {
                    return false;
                }
            }

            // Date processing
            if (dateFrom || dateTo) {
                const itemDate = new Date(item.date);
                if (dateFrom && dateTo) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (itemDate < from || itemDate > to) return false;
                } else if (dateFrom) {
                    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
                    if (itemDate < from) return false;
                } else if (dateTo) {
                    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
                    if (itemDate > to) return false;
                }
            }

            return true;
        });
    }, [items, searchTerm, typeFilter, personFilter, dateFrom, dateTo]);

    // Aggregate statistics
    const stats = useMemo(() => {
        let totalCredits = 0;
        let totalPrice = 0;
        let trainingsCount = 0;
        let proceduresCount = 0;
        let trainingParticipants = 0;

        filteredItems.forEach(item => {
            if (item.type === 'training') {
                trainingsCount++;
                totalCredits += item.priceOrCredits * item.participantsCount;
                trainingParticipants += item.participantsCount;
            } else {
                proceduresCount++;
                totalPrice += item.priceOrCredits;
            }
        });

        return {
            totalItems: filteredItems.length,
            totalCredits,
            totalPrice,
            trainingsCount,
            proceduresCount,
            trainingParticipants
        };
    }, [filteredItems]);

    // Group items by Person for charts
    const groupedTrainers = useMemo(() => {
        const groups: Record<string, { name: string, count: number, value: number, participants: number }> = {};

        filteredItems.forEach(item => {
            if (item.type === 'training') {
                const val = item.priceOrCredits * item.participantsCount;
                if (!groups[item.personName]) {
                    groups[item.personName] = { name: item.personName, count: 0, value: 0, participants: 0 };
                }
                groups[item.personName].count += 1;
                groups[item.personName].value += val;
                groups[item.personName].participants += item.participantsCount;
            }
        });

        return Object.values(groups).sort((a, b) => b.value - a.value);
    }, [filteredItems]);

    const maxTrainerValue = Math.max(...groupedTrainers.map(g => g.value), 1);

    const groupedTherapists = useMemo(() => {
        const groups: Record<string, { name: string, count: number, value: number }> = {};

        filteredItems.forEach(item => {
            if (item.type === 'procedure') {
                const val = item.priceOrCredits;
                if (!groups[item.personName]) {
                    groups[item.personName] = { name: item.personName, count: 0, value: 0 };
                }
                groups[item.personName].count += 1;
                groups[item.personName].value += val;
            }
        });

        return Object.values(groups).sort((a, b) => b.value - a.value);
    }, [filteredItems]);

    const maxTherapistValue = Math.max(...groupedTherapists.map(g => g.value), 1);

    // Pagination slice
    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Top Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', gap: '2rem', marginBottom: '-1rem' }}>
                <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                        padding: '1rem 0', background: 'none', border: 'none',
                        borderBottom: activeTab === 'overview' ? '2px solid #93745F' : '2px solid transparent',
                        color: activeTab === 'overview' ? '#111827' : '#6b7280',
                        fontWeight: activeTab === 'overview' ? 600 : 500,
                        cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <BarChart2 size={18} /> Prehľad a Grafy
                </button>
                <button
                    onClick={() => setActiveTab('table')}
                    style={{
                        padding: '1rem 0', background: 'none', border: 'none',
                        borderBottom: activeTab === 'table' ? '2px solid #93745F' : '2px solid transparent',
                        color: activeTab === 'table' ? '#111827' : '#6b7280',
                        fontWeight: activeTab === 'table' ? 600 : 500,
                        cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    <Table size={18} /> Detailná Tabuľka ({filteredItems.length})
                </button>
            </div>

            {/* Global Filters (Apply to both tabs) */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white', appearance: 'none' }}
                        >
                            <option value="all">Všetky služby</option>
                            <option value="training">Iba Tréningy</option>
                            <option value="procedure">Iba Kozmetické Procedúry</option>
                        </select>
                    </div>

                    <div style={{ flex: '1 1 200px' }}>
                        <select
                            value={personFilter}
                            onChange={(e) => setPersonFilter(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white', appearance: 'none' }}
                        >
                            <option value="all">Všetci tréneri / terapeuti</option>
                            {uniquePersons.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.3rem' }}>Dátum od:</label>
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem' }} />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.3rem' }}>Dátum do:</label>
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem' }} />
                    </div>
                    {(dateFrom || dateTo) && (
                        <div>
                            <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '0.6rem 1rem', background: '#fef2f2', color: '#b91c1c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                Zrušiť dátum
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

                        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Celkom Kredity <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#3b82f6' }}>(Tréningy)</span></div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', fontFamily: 'var(--font-heading)' }}>{stats.totalCredits}</div>
                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>Zo {stats.trainingsCount} tréningov ({stats.trainingParticipants} osôb)</div>
                        </div>
                        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
                            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 500 }}>Celkom Tržba <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#10b981' }}>(Procedúry)</span></div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', fontFamily: 'var(--font-heading)' }}>{stats.totalPrice} €</div>
                            <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.2rem' }}>Z {stats.proceduresCount} procedúr</div>
                        </div>
                    </div>

                    {/* CSS Bar Charts - Trainers */}
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> Výkon podľa trénerov (Tréningy - Kredity)
                        </h3>

                        {groupedTrainers.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Žiadne dáta pre zobrazenie grafu trénerov.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {groupedTrainers.map((person, idx) => {
                                    const percentage = (person.value / maxTrainerValue) * 100;

                                    return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 500 }}>
                                                <span>{person.name} <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 'normal' }}>({person.count} tréningov, {person.participants} osôb)</span></span>
                                                <span style={{ color: '#3b82f6' }}>{person.value} Kr.</span>
                                            </div>
                                            <div style={{ width: '100%', height: '12px', backgroundColor: '#eff6ff', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        width: `${percentage}%`, height: '100%', backgroundColor: '#3b82f6', borderRadius: '999px',
                                                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* CSS Bar Charts - Therapists */}
                    <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> Výkon podľa terapeutiek (Procedúry - Eurá)
                        </h3>

                        {groupedTherapists.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Žiadne dáta pre zobrazenie grafu terapeutiek.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {groupedTherapists.map((person, idx) => {
                                    const percentage = (person.value / maxTherapistValue) * 100;

                                    return (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 500 }}>
                                                <span>{person.name} <span style={{ color: '#6b7280', fontSize: '0.85rem', fontWeight: 'normal' }}>({person.count} procedúr)</span></span>
                                                <span style={{ color: '#10b981' }}>{person.value} €</span>
                                            </div>
                                            <div style={{ width: '100%', height: '12px', backgroundColor: '#ecfdf5', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div
                                                    style={{
                                                        width: `${percentage}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '999px',
                                                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'table' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                    {/* Search Field specifically for table view */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Hľadať zákazníka, službu..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none', fontSize: '0.95rem', backgroundColor: 'white' }}
                        />
                    </div>

                    {/* Table */}
                    <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                                        <th style={{ padding: '1rem', fontWeight: 500 }}>Dátum & Čas</th>
                                        <th style={{ padding: '1rem', fontWeight: 500 }}>Typ / Názov</th>
                                        <th style={{ padding: '1rem', fontWeight: 500 }}>Zákazník</th>
                                        <th style={{ padding: '1rem', fontWeight: 500 }}>Osoba (Tréner/Terap.)</th>
                                        <th style={{ padding: '1rem', fontWeight: 500, textAlign: 'right' }}>Hodnota</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6b7280' }}>
                                                Žiadne záznamy na tejto strane.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map(item => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.1s' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 500 }}>{formatInTimeZone(parseISO(item.date), 'Europe/Bratislava', 'dd.MM.yyyy', { locale: sk })}</div>
                                                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{formatInTimeZone(parseISO(item.date), 'Europe/Bratislava', 'HH:mm', { locale: sk })}</div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 500, color: '#111827' }}>{item.title}</div>
                                                    <div style={{ display: 'inline-flex', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '999px', marginTop: '0.3rem', backgroundColor: item.type === 'training' ? '#eff6ff' : '#ecfdf5', color: item.type === 'training' ? '#2563eb' : '#059669', fontWeight: 500 }}>
                                                        {item.type === 'training' ? 'Tréning' : 'Procedúra'}
                                                        {item.participantsCount > 1 ? ` (${item.participantsCount} osôb)` : ''}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', color: '#374151' }}>
                                                    {item.type === 'training' ? (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85rem' }}>Skupinový tréning</span>
                                                    ) : (
                                                        item.customerName
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem', color: '#4b5563', fontWeight: 500 }}>
                                                    {item.personName}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: item.type === 'training' ? '#3b82f6' : '#10b981' }}>
                                                    {item.type === 'training' ? (
                                                        `${item.priceOrCredits * item.participantsCount} Kr.`
                                                    ) : (
                                                        `${item.priceOrCredits} €`
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa' }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    Zobrazených <span style={{ fontWeight: 600, color: '#111827' }}>{((currentPage - 1) * itemsPerPage) + 1}</span> až <span style={{ fontWeight: 600, color: '#111827' }}>{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> z <span style={{ fontWeight: 600, color: '#111827' }}>{filteredItems.length}</span> výsledkov
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        style={{ padding: '0.4rem 0.8rem', backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#9ca3af' : '#374151' }}
                                    >
                                        Predchádzajúca
                                    </button>
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        style={{ padding: '0.4rem 0.8rem', backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#9ca3af' : '#374151' }}
                                    >
                                        Ďalšia
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
