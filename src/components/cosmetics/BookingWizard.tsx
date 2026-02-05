'use client';

import { useState, useEffect } from 'react';
import { getCosmeticServices, getEmployees, getAvailableSlots, createAppointment } from '@/actions/cosmetic-actions';
import { Calendar as CalendarIcon, Clock, CheckCircle, ChevronRight, ChevronLeft, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVerification } from '@/components/auth/VerificationContext';

interface Service { id: string; title: string; price: number; duration_minutes: number; }
interface Employee { id: string; name: string; color: string; }

interface BookingWizardProps {
    initialServiceId?: string;
}

export function BookingWizard({ initialServiceId }: BookingWizardProps) {
    const router = useRouter();
    const { isVerified } = useVerification();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Data
    const [services, setServices] = useState<Service[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]); // Filtered via logic ideally, or fetch all and filter client side
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [slots, setSlots] = useState<string[]>([]);

    // Selection
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Initial Fetch
    useEffect(() => {
        getCosmeticServices().then(data => {
            const fetchedServices = data as Service[];
            setServices(fetchedServices);

            // Auto-select if ID provided
            if (initialServiceId) {
                const preSelected = fetchedServices.find(s => s.id === initialServiceId);
                if (preSelected) {
                    setSelectedService(preSelected);
                    setStep(2);
                }
            }
        });
        getEmployees().then(data => setAllEmployees(data as Employee[]));
    }, [initialServiceId]);

    const handleServiceSelect = (service: Service) => {
        if (!isVerified) return;
        setSelectedService(service);
        setStep(2);
    };

    const handleEmployeeSelect = (employee: Employee) => {
        setSelectedEmployee(employee);
        setStep(3);
    };

    const handleDateChange = async (date: string) => {
        setSelectedDate(date);
        setSelectedTime(null);
        if (selectedEmployee && selectedService) {
            setLoading(true);
            const availSlots = await getAvailableSlots(selectedEmployee.id, selectedService.id, date);
            setSlots(availSlots);
            setLoading(false);
        }
    };

    // Trigger slot fetch on entering step 3
    useEffect(() => {
        if (step === 3 && selectedEmployee && selectedService) {
            handleDateChange(selectedDate);
        }
    }, [step, selectedEmployee, selectedDate]);

    const handleConfirm = async () => {
        if (!selectedService || !selectedEmployee || !selectedTime) return;

        setLoading(true);
        const startTime = `${selectedDate}T${selectedTime}:00`;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + selectedService.duration_minutes * 60000);

        const res = await createAppointment({
            employee_id: selectedEmployee.id,
            service_id: selectedService.id,
            start_time: start.toISOString(),
            end_time: end.toISOString()
        });

        if (res.success) {
            setStep(4);
        } else {
            alert('Chyba pri rezervácii.');
        }
        setLoading(false);
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

            {/* Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', backgroundColor: '#f0f0f0', zIndex: 0 }}></div>
                {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{
                        width: '30px', height: '30px',
                        borderRadius: '50%',
                        backgroundColor: step >= s ? '#5E715D' : '#eee',
                        color: step >= s ? 'white' : '#999',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold',
                        position: 'relative',
                        zIndex: 1,
                        transition: 'all 0.3s ease'
                    }}>
                        {step > s ? <CheckCircle size={16} /> : s}
                    </div>
                ))}
            </div>

            {/* Step 1: Services */}
            {step === 1 && (
                <div>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte procedúru</h2>
                    {!isVerified && (
                        <div style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: '#854D0E', textAlign: 'center' }}>
                            ⚠️ Pre rezerváciu termínu musíte mať overený email. Prosím skontrolujte si emailovú schránku.
                        </div>
                    )}
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {services.map(service => (
                            <div
                                key={service.id}
                                onClick={() => handleServiceSelect(service)}
                                title={!isVerified ? "Pre rezerváciu musíte overiť email" : ""}
                                style={{
                                    padding: '1.5rem',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    cursor: !isVerified ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: !isVerified ? 0.6 : 1,
                                    backgroundColor: !isVerified ? '#f9f9f9' : undefined
                                }}
                                onMouseEnter={(e) => { if (isVerified) e.currentTarget.style.backgroundColor = '#fafafa'; }}
                                onMouseLeave={(e) => { if (isVerified) e.currentTarget.style.backgroundColor = 'white'; }}
                            >
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{service.title}</h3>
                                    <span style={{ color: '#666', fontSize: '0.9rem' }}>
                                        <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                                        {service.duration_minutes} min
                                    </span>
                                </div>
                                <span style={{ fontWeight: 'bold', color: '#5E715D' }}>{service.price} €</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Employees */}
            {step === 2 && (
                <div>
                    <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <ChevronLeft size={16} /> Späť
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte špecialistu</h2>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {allEmployees.map(emp => (
                            <div
                                key={emp.id}
                                onClick={() => handleEmployeeSelect(emp)}
                                style={{
                                    padding: '1rem',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <div style={{
                                    width: '50px', height: '50px', borderRadius: '50%', backgroundColor: emp.color || '#5E715D',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                                }}>
                                    <User size={24} />
                                </div>
                                <span style={{ fontWeight: '500' }}>{emp.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 && (
                <div>
                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <ChevronLeft size={16} /> Späť
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte termín</h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dátum</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            min={new Date().toISOString().split('T')[0]} // Disable past dates
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '6px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Dostupné časy</label>
                        {loading ? (
                            <p style={{ color: '#888' }}>Načítavam...</p>
                        ) : slots.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.8rem' }}>
                                {slots.map(time => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        style={{
                                            padding: '0.6rem',
                                            borderRadius: '6px',
                                            border: selectedTime === time ? '2px solid #5E715D' : '1px solid #ddd',
                                            backgroundColor: selectedTime === time ? '#e6f4ea' : 'white',
                                            color: selectedTime === time ? '#1e7e34' : '#333',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#d93025', backgroundColor: '#fff0f0', padding: '1rem', borderRadius: '6px' }}>
                                Pre tento deň nie sú dostupné žiadne termíny. Skúste iný deň.
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!selectedTime || loading}
                        className="button"
                        style={{
                            width: '100%',
                            backgroundColor: '#5E715D',
                            color: 'white',
                            padding: '1rem',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            cursor: (!selectedTime || loading) ? 'not-allowed' : 'pointer',
                            opacity: (!selectedTime || loading) ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Rezervujem...' : 'Potvrdiť rezerváciu'}
                    </button>
                </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e6f4ea', color: '#1e7e34',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto'
                    }}>
                        <CheckCircle size={48} />
                    </div>
                    <h2 style={{ marginBottom: '1rem' }}>Služba úspešne rezervovaná!</h2>
                    <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '2rem' }}>
                        Tešíme sa na vás.<br />
                        Termín: <strong>{new Date(selectedDate).toLocaleDateString()} o {selectedTime}</strong><br />
                        Služba: {selectedService?.title} ({selectedEmployee?.name})
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/cosmetics/calendar')}
                        className="button"
                        style={{
                            backgroundColor: '#5E715D', color: 'white', padding: '0.8rem 2rem',
                            border: 'none', borderRadius: '6px', cursor: 'pointer'
                        }}
                    >
                        Prejsť na kalendár
                    </button>
                </div>
            )}
        </div>
    );
}
