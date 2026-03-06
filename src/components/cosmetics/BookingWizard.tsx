'use client';

import { useState, useEffect } from 'react';
import { getCosmeticServices, getEmployees, getEmployeesForService, getAvailableSlots, createAppointment } from '@/actions/cosmetic-actions';
import { Calendar as CalendarIcon, Clock, CheckCircle, ChevronRight, ChevronLeft, User, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVerification } from '@/components/auth/VerificationContext';
import { Calendar } from '@/components/ui/Calendar';

interface Service { id: string; title: string; price: number; duration_minutes: number; category: string; }
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
    const [availableDates, setAvailableDates] = useState<string[]>([]);

    // Selection
    const [selectedCategory, setSelectedCategory] = useState<'beauty' | 'body' | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [isMorningOpen, setIsMorningOpen] = useState(false);
    const [isAfternoonOpen, setIsAfternoonOpen] = useState(false);
    const [notes, setNotes] = useState('');

    // Initial Fetch
    useEffect(() => {
        getCosmeticServices().then(data => {
            const fetchedServices = data as Service[];
            setServices(fetchedServices);

            // Auto-select if ID provided
            if (initialServiceId) {
                const preSelected = fetchedServices.find(s => s.id === initialServiceId);
                if (preSelected) {
                    setSelectedCategory((preSelected.category as 'beauty' | 'body') || 'beauty');
                    setSelectedService(preSelected);
                    setStep(3);
                }
            }
        });
    }, [initialServiceId]);

    // When Step 3 becomes active (or service selected), fetch relevant employees
    useEffect(() => {
        if (selectedService && step === 3) {
            setLoading(true);
            getEmployeesForService(selectedService.id).then(data => {
                const fetchedEmployees = data as Employee[];
                if (fetchedEmployees.length > 1) {
                    setAllEmployees([{ id: 'any', name: 'Nezáleží', color: '#9ca3af' }, ...fetchedEmployees]);
                } else {
                    setAllEmployees(fetchedEmployees);
                }
                setLoading(false);
            });
        }
    }, [selectedService, step]);

    const handleCategorySelect = (category: 'beauty' | 'body') => {
        if (!isVerified) return;
        setSelectedCategory(category);
        setStep(2);
    };

    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        setStep(3);
    };

    const handleEmployeeSelect = (employee: Employee) => {
        setSelectedEmployee(employee);
        setStep(4);
    };

    const handleDateChange = async (date: string) => {
        setSelectedDate(date);
        setSelectedTime(null);
        setIsMorningOpen(false);
        setIsAfternoonOpen(false);
        if (selectedEmployee && selectedService) {
            setLoading(true);

            // Allow dynamic server action import here to prevent top-level client component errors if needed, or import at top
            const action = selectedEmployee.id === 'any' ? (await import('@/actions/cosmetic-actions')).getAvailableSlotsAnyEmployee : getAvailableSlots;
            const availSlots = await action(selectedEmployee.id, selectedService.id, date);

            // Filter past times if selecting today
            const now = new Date();
            const selectedDateObj = new Date(date);
            const isToday = selectedDateObj.toDateString() === now.toDateString();

            let filteredSlots = availSlots;
            if (isToday) {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                filteredSlots = availSlots.filter(time => {
                    const [h, m] = time.split(':').map(Number);
                    return (h * 60 + m) > currentMinutes;
                });
            }

            setSlots(filteredSlots);
            setLoading(false);
        }
    };

    // Trigger slot fetch on entering step 4
    useEffect(() => {
        if (step === 4 && selectedEmployee && selectedService) {
            handleDateChange(selectedDate);

            // Initial month fetch for availability highlights
            const d = new Date(selectedDate);
            handleMonthChange(d.getFullYear(), d.getMonth() + 1);
        }
    }, [step, selectedEmployee, selectedDate]);

    const handleMonthChange = async (year: number, month: number) => {
        if (!selectedEmployee || !selectedService) return;

        try {
            const action = selectedEmployee.id === 'any'
                ? (await import('@/actions/cosmetic-actions')).getAvailableDaysInMonthAnyEmployee
                : (await import('@/actions/cosmetic-actions')).getAvailableDaysInMonth;

            const dates = await action(selectedEmployee.id, selectedService.id, year, month);
            setAvailableDates(dates);
        } catch (error) {
            console.error('Failed to fetch available dates for month:', error);
            setAvailableDates([]);
        }
    };

    const handleConfirm = async () => {
        if (!selectedService || !selectedEmployee || !selectedTime) return;

        setLoading(true);
        const startTime = `${selectedDate}T${selectedTime}:00`;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + selectedService.duration_minutes * 60000);

        const action = selectedEmployee.id === 'any' ? (await import('@/actions/cosmetic-actions')).createAppointmentAnyEmployee : createAppointment;

        const res = await action({
            employee_id: selectedEmployee.id,
            service_id: selectedService.id,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            notes: notes.trim() || undefined
        });

        if (res.success) {
            if ('assignedEmployee' in res && res.assignedEmployee) {
                setSelectedEmployee(res.assignedEmployee as Employee);
            }
            setStep(5);
        } else {
            alert('Chyba pri rezervácii: ' + (res.error || 'Neznáma chyba'));
        }
        setLoading(false);
    };

    // Helper for grouping slots by Morning (< 12:00) and Afternoon (>= 12:00)
    const slotsByHour = {
        morning: slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0], 10);
            return hour < 12;
        }),
        afternoon: slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0], 10);
            return hour >= 12;
        })
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>

            {/* Progress Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', backgroundColor: '#f0f0f0', zIndex: 0 }}></div>
                {[1, 2, 3, 4, 5].map(s => (
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

            {/* Step 1: Category */}
            {step === 1 && (
                <div>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte typ služby</h2>
                    {!isVerified && (
                        <div style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: '#854D0E', textAlign: 'center' }}>
                            ⚠️ Pre rezerváciu termínu musíte mať overený email. Prosím skontrolujte si emailovú schránku.
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div
                            onClick={() => handleCategorySelect('beauty')}
                            style={{
                                padding: '2rem',
                                border: '2px solid #eee',
                                borderRadius: '12px',
                                cursor: !isVerified ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                opacity: !isVerified ? 0.6 : 1,
                                backgroundColor: !isVerified ? '#f9f9f9' : 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1rem'
                            }}
                            onMouseEnter={(e) => { if (isVerified) { e.currentTarget.style.borderColor = '#5E715D'; e.currentTarget.style.backgroundColor = '#fafafa'; } }}
                            onMouseLeave={(e) => { if (isVerified) { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.backgroundColor = 'white'; } }}
                        >
                            <Sparkles size={48} color="#5E715D" />
                            <h3 style={{ margin: 0 }}>Face</h3>
                        </div>
                        <div
                            onClick={() => handleCategorySelect('body')}
                            style={{
                                padding: '2rem',
                                border: '2px solid #eee',
                                borderRadius: '12px',
                                cursor: !isVerified ? 'not-allowed' : 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                opacity: !isVerified ? 0.6 : 1,
                                backgroundColor: !isVerified ? '#f9f9f9' : 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1rem'
                            }}
                            onMouseEnter={(e) => { if (isVerified) { e.currentTarget.style.borderColor = '#5E715D'; e.currentTarget.style.backgroundColor = '#fafafa'; } }}
                            onMouseLeave={(e) => { if (isVerified) { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.backgroundColor = 'white'; } }}
                        >
                            <User size={48} color="#5E715D" />
                            <h3 style={{ margin: 0 }}>Body</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Services */}
            {step === 2 && (
                <div>
                    <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <ChevronLeft size={16} /> Späť
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte procedúru</h2>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {services.filter(s => (s.category || 'beauty') === selectedCategory).map(service => (
                            <div
                                key={service.id}
                                onClick={() => handleServiceSelect(service)}
                                style={{
                                    padding: '1.5rem',
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
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
                        {services.filter(s => (s.category || 'beauty') === selectedCategory).length === 0 && (
                            <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                                V tejto kategórii momentálne nemáme dostupné žiadne služby.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Step 3: Employees */}
            {step === 3 && (
                <div>
                    <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', color: '#666' }}>
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

            {/* Step 4: Date & Time */}
            {step === 4 && (
                <div>
                    <button onClick={() => setStep(3)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', color: '#666' }}>
                        <ChevronLeft size={16} /> Späť
                    </button>
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Vyberte termín</h2>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        marginBottom: '2rem',
                        alignItems: 'center'
                    }}>
                        {/* Left Side: Calendar */}
                        <div>
                            <Calendar
                                selectedDate={selectedDate}
                                onDateSelect={handleDateChange}
                                minDate={new Date().toISOString().split('T')[0]}
                                availableDates={availableDates}
                                onMonthChange={handleMonthChange}
                            />
                        </div>

                        {/* Bottom: Grouped Slots */}
                        <div style={{ width: '100%' }}>
                            {loading ? (
                                <p style={{ color: '#888' }}>Načítavam...</p>
                            ) : slots.length > 0 ? (
                                <div>
                                    {slotsByHour.morning.length > 0 && (
                                        <div style={{ marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                                            <button
                                                onClick={() => setIsMorningOpen(!isMorningOpen)}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    backgroundColor: '#f9f9f9',
                                                    border: 'none',
                                                    borderBottom: isMorningOpen ? '1px solid #ddd' : 'none',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    color: '#333'
                                                }}
                                            >
                                                DOOBEDA
                                                <span style={{ transform: isMorningOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                            </button>
                                            {isMorningOpen && (
                                                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.8rem', backgroundColor: 'white' }}>
                                                    {slotsByHour.morning.map(time => (
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
                                            )}
                                        </div>
                                    )}

                                    {slotsByHour.afternoon.length > 0 && (
                                        <div style={{ marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                                            <button
                                                onClick={() => setIsAfternoonOpen(!isAfternoonOpen)}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    backgroundColor: '#f9f9f9',
                                                    border: 'none',
                                                    borderBottom: isAfternoonOpen ? '1px solid #ddd' : 'none',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    color: '#333'
                                                }}
                                            >
                                                POOBEDE
                                                <span style={{ transform: isAfternoonOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                                            </button>
                                            {isAfternoonOpen && (
                                                <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.8rem', backgroundColor: 'white' }}>
                                                    {slotsByHour.afternoon.map(time => (
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
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p style={{ color: '#d93025', backgroundColor: '#fff0f0', padding: '1rem', borderRadius: '6px' }}>
                                    Pre tento deň nie sú dostupné žiadne termíny. Skúste iný deň.
                                </p>
                            )}
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem', width: '100%' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#333' }}>
                            Poznámka k rezervácii (voliteľné)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Máte špecifickú požiadavku alebo preferenciu? Napíšte nám..."
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                minHeight: '100px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                        />
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

            {/* Step 5: Success */}
            {step === 5 && (
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

                </div>
            )}
        </div>
    );
}
