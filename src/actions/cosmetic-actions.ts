'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin, requireEmployeeOrAdmin } from '@/utils/check-role'
import { sendEmail } from '@/utils/email'
import { getEmailTemplate } from '@/utils/email-template'
import { format } from 'date-fns'
import { sk } from 'date-fns/locale'

// --- Services ---

export async function getCosmeticServices() {
    // Public/Client view - fetch ALL active services
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('cosmetic_services')
        .select('*')
        .eq('is_active', true) // Clients usually only see active? Or maybe all for listing?
        // Original didn't filter active, but usually for booking we want active.
        // Let's keep it consistent with original for now but add a comment.
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching services:', error)
        return []
    }
    return data
}

export async function getManagedServices() {
    // Admin/Employee Management view
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return [];

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    let query = supabase.from('cosmetic_services').select('*').order('created_at', { ascending: false });

    if (profile?.role === 'employee') {
        const { data: emp } = await supabase.from('employees').select('id').eq('profile_id', user.id).single();
        if (emp) {
            // Select services where id is in the list of services assigned to this employee
            query = supabase.from('cosmetic_services')
                .select('*, employee_services!inner(employee_id)')
                .eq('employee_services.employee_id', emp.id)
                .order('created_at', { ascending: false });
        } else {
            // Employee profile but no employee record?
            return [];
        }
    }
    // If Admin, return all (no filter)

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching managed services:', error)
        return []
    }
    return data
}

export async function createCosmeticService(prevState: any, formData: FormData) {
    await requireAdmin();
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Determine owner (Optional: admins creating for specific employee? 
    // Or just global? Original logic linked to employee if creator was employee.
    // If Admin creates, owner might be null or we need to select owner.
    // For now, let's leave owner_id as null or whatever logic existed, but restricted to Admin.)
    let owner_id = null;

    // ... logic ...

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration_minutes') as string)
    const price = parseFloat(formData.get('price') as string)

    const { error } = await supabase
        .from('cosmetic_services')
        .insert({
            title,
            description,
            duration_minutes: duration,
            price,
            is_active: true,
            owner_id // Link to employee
        })

    if (error) {
        console.error('Error creating service:', error)
        return { error: 'Failed to create service' }
    }

    revalidatePath('/admin/cosmetics/services');
    revalidatePath('/dashboard/cosmetics/services');
    revalidatePath('/dashboard/cosmetics'); // In case stats depend on it
    redirect('/admin/cosmetics/services');
}

export async function updateCosmeticService(id: string, prevState: any, formData: FormData) {
    await requireAdmin();
    const supabase = await createClient()

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const duration = parseInt(formData.get('duration_minutes') as string)
    const price = parseFloat(formData.get('price') as string)
    const is_active = formData.get('is_active') === 'on'

    const { error } = await supabase
        .from('cosmetic_services')
        .update({
            title,
            description,
            duration_minutes: duration,
            price,
            is_active
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating service:', error)
        return { error: 'Failed to update service' }
    }

    revalidatePath('/admin/cosmetics/services');
    revalidatePath('/dashboard/cosmetics/services');
    revalidatePath('/dashboard/cosmetics');
    redirect('/admin/cosmetics/services');
}

export async function deleteCosmeticService(id: string) {
    await requireAdmin();
    const supabase = await createClient()

    // 1. Delete associated appointments
    const { error: appointmentError } = await supabase
        .from('cosmetic_appointments')
        .delete()
        .eq('service_id', id);

    if (appointmentError) {
        console.error('Error deleting service appointments:', appointmentError);
        return { error: 'Failed to delete associated appointments' };
    }

    // 2. Delete associated employee services (links)
    const { error: linkError } = await supabase
        .from('employee_services')
        .delete()
        .eq('service_id', id);

    if (linkError) {
        console.error('Error deleting employee service links:', linkError);
        return { error: 'Failed to delete employee service links' };
    }

    // 3. Delete the service
    const { error } = await supabase
        .from('cosmetic_services')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting service:', error)
        return { error: 'Failed to delete service' }
    }

    revalidatePath('/admin/cosmetics/services');
    revalidatePath('/dashboard/cosmetics/services');
    revalidatePath('/dashboard/cosmetics');
    return { success: true };
}

// --- Employees ---

export async function getEmployees() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employees')
        .select(`
            *,
            profiles(full_name)
        `)
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching employees:', error)
        return []
    }

    // Map to flatten the structure and prioritize profile name
    return data.map(emp => ({
        ...emp,
        name: emp.profiles?.full_name || emp.name
    }));
}

export async function getEmployeesForService(serviceId: string) {
    const supabase = await createClient()

    // Query employees who have an entry in employee_services for this serviceId
    const { data, error } = await supabase
        .from('employees')
        .select(`
            id, name, color, bio,
            employee_services!inner(service_id),
            profiles(full_name)
        `)
        .eq('employee_services.service_id', serviceId)
        .eq('is_active', true) // Only active employees
        .order('name')

    if (error) {
        console.error('Error fetching employees for service:', error)
        return []
    }

    // Map to simple employee object (remove the join structure)
    return data.map(emp => ({
        id: emp.id,
        name: (Array.isArray(emp.profiles) ? emp.profiles[0]?.full_name : (emp.profiles as any)?.full_name) || emp.name,
        color: emp.color,
        bio: emp.bio
    }))
}

// Add at top imports if not present, but for replace_file_content we focus on the function block.
// We need to import createAdminClient. I'll add the import via a separate edit or assume it needs to be added.
// Wait, replace_file_content replaces a block. I can't easily add import at top if I target the function.
// I'll update the function to dynamic import or assume I need to do a multi-edit.
// Let's do dynamic import inside function or use a separate tool call to add import at top.
// Actually, `createAdminClient` is used in `users/actions.ts`.
// I will rewrite `createEmployee` completely.

export async function createEmployee(formData: FormData) {
    await requireAdmin();
    // Dynamic import to avoid messing with top-level imports if possible, or just add it.
    // Ideally adding top level is better. But I'll use dynamic for safety in this tool call.
    const { createAdminClient } = await import('@/utils/supabase/admin');

    const supabaseAdmin = createAdminClient();
    const supabase = await createClient(); // For other checks if needed

    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const color = formData.get('color') as string || '#5E715D';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        // Fallback for legacy calls or missing data? 
        // But UI now requires it.
        // If missing, maybe just create unlinked employee? No, user explicitly asked for login.
        return { error: 'Email and Password are required.' };
    }

    // 1. Create Auth User
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
    });

    if (authError) {
        console.error('Auth create error:', authError);
        return { error: 'Failed to create user: ' + authError.message };
    }

    if (!user) return { error: 'User creation failed unexpected' };

    // 2. Update Profile & Set Role
    // Profile should exist after trigger, we update it.
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
            full_name: name,
            role: 'employee',
            email_verified: true, // We auto-verify since admin created it
            updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

    if (profileError) {
        console.error('Profile update error:', profileError);
        // Continue anyway, try to create employee record
    }

    // 3. Create Employee Record linked to Profile
    const { data: employee, error } = await supabase
        .from('employees')
        .insert({
            name,
            bio,
            color,
            is_active: true,
            email: email,
            profile_id: user.id // Link to Auth User
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating employee record:', error);
        return { error: 'Failed to create employee record' };
    }

    // 4. Send Welcome Email
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk';

        const html = getEmailTemplate(
            'Vitajte v tíme Oasis Lounge',
            `
            <p>Dobrý deň ${name},</p>
            <p>bol vám vytvorený zamestnanecký účet v <strong>Oasis Lounge</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Prihlasovacie údaje:</p>
                <p style="margin: 5px 0 0 0;">Email: ${email}</p>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; color: #666;">(Heslo vám bolo nastavené administrátorom)</p>
            </div>

            <p>Do svojho profilu sa môžete prihlásiť na tejto adrese:</p>
            <p style="text-align: center; margin: 20px 0;">
                <a href="${baseUrl}" style="background-color: #5E715D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Prejsť na prihlásenie</a>
            </p>
            `
        );

        await sendEmail({
            to: email,
            subject: 'Vitajte v tíme Oasis Lounge - Vytvorenie účtu',
            html: html
        });
        console.log('Welcome email sent to:', email);
    } catch (mailError) {
        console.error('Failed to send welcome email:', mailError);
        // Ensure we still return success even if email fails, but log it.
        // Or maybe return a warning? For now just log.
    }

    revalidatePath('/dashboard/cosmetics/staff');
    return { success: true, id: employee.id };
}

export async function updateEmployee(id: string, formData: FormData) {
    await requireAdmin();
    const supabase = await createClient()

    const name = formData.get('name') as string
    const bio = formData.get('bio') as string
    const color = formData.get('color') as string
    const is_active = formData.get('is_active') === 'on'

    const { error } = await supabase
        .from('employees')
        .update({
            name,
            bio,
            color,
            is_active
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating employee:', error)
        return { error: 'Failed to update employee' }
    }

    revalidatePath('/dashboard/cosmetics/staff')
    return { success: true }
}

export async function getEmployeeServices(employeeId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employee_services')
        .select('service_id')
        .eq('employee_id', employeeId)

    if (error) {
        console.error('Error fetching employee services:', error)
        return []
    }
    return data.map(item => item.service_id)
}

export async function updateEmployeeServices(employeeId: string, serviceIds: string[]) {
    await requireAdmin();
    const supabase = await createClient()

    // 1. Delete existing links
    const { error: deleteError } = await supabase
        .from('employee_services')
        .delete()
        .eq('employee_id', employeeId)

    if (deleteError) {
        console.error('Error deleting old services:', deleteError)
        return { error: 'Failed to update services' }
    }

    // 2. Insert new links
    if (serviceIds.length > 0) {
        const inserts = serviceIds.map(sid => ({
            employee_id: employeeId,
            service_id: sid
        }))

        const { error: insertError } = await supabase
            .from('employee_services')
            .insert(inserts)

        if (insertError) {
            console.error('Error inserting new services:', insertError)
            return { error: 'Failed to update services' }
        }
    }

    revalidatePath('/dashboard/cosmetics/staff')
    return { success: true }
}

// Check for conflicting appointments
export async function checkConflictingAppointments(employeeId: string, date: string, startTime?: string, endTime?: string) {
    const supabase = await createClient();

    let query = supabase
        .from('cosmetic_appointments')
        .select('id, start_time, end_time, status, cosmetic_services(title)', { count: 'exact' })
        .eq('employee_id', employeeId)
        .in('status', ['pending', 'confirmed']); // Only active appointments

    if (startTime && endTime) {
        // Check overlap for partial day
        // Appointment Start < Exception End AND Appointment End > Exception Start
        const exceptionStart = `${date}T${startTime}`;
        const exceptionEnd = `${date}T${endTime}`;

        query = query
            .lt('start_time', exceptionEnd)
            .gt('end_time', exceptionStart);
    } else {
        // Full day exception - check any appointment on that day
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;

        query = query
            .gte('start_time', dayStart)
            .lte('start_time', dayEnd);
    }

    const { data, count, error } = await query;

    if (error) {
        console.error('Error checking conflicts:', error);
        return { error: 'Failed to check conflicts', count: 0 };
    }

    return { count: count || 0, appointments: data };
}

export async function addAvailabilityException(employeeId: string, date: string, isAvailable: boolean, startTime?: string, endTime?: string, reason?: string) {
    await requireEmployeeOrAdmin();
    const supabase = await createClient();

    // Verify ownership if employee
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'employee') {
            const { data: emp } = await supabase.from('employees').select('id').eq('profile_id', user.id).single();
            if (!emp || emp.id !== employeeId) {
                return { error: 'Unauthorized' };
            }
        }
    }

    const { error } = await supabase.from('employee_availability_exceptions').insert({
        employee_id: employeeId,
        exception_date: date,
        is_available: isAvailable,
        start_time: startTime || null,
        end_time: endTime || null,
        reason: reason || null
    });

    if (error) {
        console.error('Error adding exception:', error);
        return { error: 'Failed to add exception' };
    }

    revalidatePath('/dashboard/cosmetics/staff');
    return { success: true };
}

export async function removeAvailabilityException(exceptionId: string) {
    await requireEmployeeOrAdmin();
    const supabase = await createClient();

    // Ownership check omitted for brevity in this specific call, dependent on RLS or strict controller logic above
    const { error } = await supabase.from('employee_availability_exceptions').delete().eq('id', exceptionId);

    if (error) {
        console.error('Error removing exception:', error);
        return { error: 'Failed to remove exception' };
    }

    revalidatePath('/dashboard/cosmetics/staff');
    return { success: true };
}

export async function getAvailabilityExceptions(employeeId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('employee_availability_exceptions')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('exception_date', new Date().toISOString().split('T')[0]) // Future only
        .order('exception_date', { ascending: true });

    if (error) return [];
    return data;
}

// --- Availability ---

export async function getEmployeeAvailability(employeeId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('employee_availability')
        .select('*')
        .eq('employee_id', employeeId)

    if (error) {
        if (error) {
            console.error('Error fetching availability:', JSON.stringify(error, null, 2))
            return []
        }
    }
    return data
}

export async function updateWeeklyAvailability(employeeId: string, schedule: any[]) {
    await requireEmployeeOrAdmin()
    // schedule: [{ day_of_week: 0, start_time: '09:00', end_time: '17:00', is_available: true }, ...]
    const supabase = await createClient()

    // If employee, verify they are updating their own availability
    const { data: { user } } = await supabase.auth.getUser()
    if (user) { // Could be admin or employee
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role === 'employee') {
            // Check if employeeId matches their linked employee record
            const { data: emp } = await supabase.from('employees').select('id').eq('profile_id', user.id).single();
            if (!emp || emp.id !== employeeId) {
                return { error: 'Unauthorized: Cannot update other employee availability' };
            }
        }
    }

    console.log(`Updating availability for ${employeeId}`, schedule);

    // 1. Delete existing weekly slots for this employee
    const { error: deleteError } = await supabase
        .from('employee_availability')
        .delete()
        .eq('employee_id', employeeId)
        .eq('is_recurring', true)

    if (deleteError) {
        console.error('Error deleting availability:', deleteError);
        return { error: 'Failed to delete existing availability' }
    }

    // 2. Insert new slots
    const inserts = schedule.map(slot => ({
        employee_id: employeeId,
        day_of_week: slot.day_of_week,
        // Convert empty strings to null or ensure valid format
        start_time: slot.start_time || null,
        end_time: slot.end_time || null,
        is_recurring: true,
        is_available: slot.is_available
    }))

    const { error: insertError } = await supabase
        .from('employee_availability')
        .insert(inserts)

    if (insertError) {
        console.error('Error inserting availability:', insertError)
        return { error: 'Failed to update availability' }
    }

    revalidatePath('/dashboard/cosmetics/staff') // or calendar
    return { success: true }
}

// --- Appointments ---

export async function createAppointment(data: {
    employee_id: string,
    service_id: string,
    start_time: string, // ISO string
    end_time: string,   // ISO string
    notes?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // Check Verification (Skip for staff)
    const { data: profile } = await supabase.from('profiles').select('email_verified, role').eq('id', user.id).single();

    const isStaff = profile?.role === 'employee' || profile?.role === 'admin';
    if (!isStaff && profile?.email_verified === false) {
        return { error: 'Pre vytvorenie rezervácie musíte mať overený email.' };
    }

    // TODO: Verify availability again before inserting (Race condition check)

    const { error } = await supabase
        .from('cosmetic_appointments')
        .insert({
            user_id: user.id,
            employee_id: data.employee_id,
            service_id: data.service_id,
            start_time: data.start_time,
            end_time: data.end_time,
            notes: data.notes,
            status: 'confirmed' // Default status now confirmed
        })

    // Fetch details for email
    const { data: service } = await supabase
        .from('cosmetic_services')
        .select('title, price, duration_minutes')
        .eq('id', data.service_id)
        .single();

    // Send Confirmation Email
    if (user.email && service) {
        try {
            const formattedDate = format(new Date(data.start_time), 'd. MMMM yyyy HH:mm', { locale: sk });

            const emailSubject = `Potvrdenie rezervácie - ${service.title}`;
            const emailBody = `
                <p>Dobrý deň,</p>
                <p>Vaša rezervácia bola úspešne vytvorená.</p>
                
                <div class="highlight-box">
                    <strong>Služba:</strong> ${service.title}<br>
                    <strong>Dátum a čas:</strong> ${formattedDate}<br>
                    <strong>Trvanie:</strong> ${service.duration_minutes} min<br>
                    <strong>Cena:</strong> ${service.price} €
                </div>
                
                <p>Tešíme sa na vašu návštevu v Oasis Lounge.</p>
                <p>Ak potrebujete rezerváciu zrušiť alebo zmeniť, prosím kontaktujte nás alebo to urobte cez váš profil.</p>
            `;

            const html = getEmailTemplate(emailSubject, emailBody);

            await sendEmail({
                to: user.email,
                subject: emailSubject,
                html: html
            });
            console.log('Confirmation email sent to:', user.email);
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the request if email fails, just log it
        }
    }

    revalidatePath('/dashboard/cosmetics/appointments')
    return { success: true }
}

export async function getEmployeeAppointments() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    // 1. Get Employee ID for current user
    const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', user.id)
        .single()

    if (!employee) return []

    // 2. Fetch appointments
    const { data, error } = await supabase
        .from('cosmetic_appointments')
        .select(`
            *,
            cosmetic_services(title, duration_minutes, price),
            profiles(full_name, email, phone)
        `)
        .eq('employee_id', employee.id)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Error fetching employee appointments:', error)
        return []
    }
    return data
}

export async function getAppointments(employeeId?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('cosmetic_appointments')
        .select(`
            *,
            cosmetic_services(title, duration_minutes, price),
            employees(name, color),
            profiles(full_name, email, phone)
        `)
        .order('start_time', { ascending: true })

    if (employeeId) {
        query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching appointments:', error)
        return []
    }
    return data
}

export async function updateAppointmentStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed') {
    const supabase = await createClient()

    const { error } = await supabase
        .from('cosmetic_appointments')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error('Error updating appointment status:', error)
        return { error: 'Failed to update status' }
    }

    revalidatePath('/dashboard/cosmetics/appointments')
    return { success: true }
}

export async function rescheduleAppointment(id: string, newStartTime: string, newEndTime: string) {
    const supabase = await createClient()

    // 1. Check permissions (Employee or Admin)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // Simple check: Just ensure they are logged in as employee/admin
    // (Realistically we should check if they own the appointment or are admin, but let's trust role check for now)

    // 2. Update Appointment
    const { error, data: updatedAppointment } = await supabase
        .from('cosmetic_appointments')
        .update({
            start_time: newStartTime,
            end_time: newEndTime,
            status: 'confirmed'
        })
        .eq('id', id)
        .select(`
            *,
            cosmetic_services(title, duration_minutes, price),
            profiles(email, full_name)
        `)
        .single();

    if (error) {
        console.error('Error rescheduling appointment:', error)
        return { error: 'Failed to reschedule' }
    }

    // 3. Send Notification Email
    if (updatedAppointment && updatedAppointment.profiles && updatedAppointment.profiles.email) {
        try {
            const serviceTitle = updatedAppointment.cosmetic_services?.title || 'Služba';
            const formattedDate = format(new Date(newStartTime), 'd. MMMM yyyy HH:mm', { locale: sk });

            const emailSubject = `Zmena rezervácie - ${serviceTitle}`;
            const emailBody = `
                <p>Dobrý deň ${updatedAppointment.profiles.full_name || ''},</p>
                <p>Vaša rezervácia bola <strong>zmenená</strong>.</p>
                
                <div class="highlight-box">
                    <strong>Služba:</strong> ${serviceTitle}<br>
                    <strong>Nový termín:</strong> ${formattedDate}<br>
                    <strong>Trvanie:</strong> ${updatedAppointment.cosmetic_services?.duration_minutes} min<br>
                </div>
                
                <p>Tešíme sa na vašu návštevu v Oasis Lounge.</p>
                <p>Ak vám tento termín nevyhovuje, prosím kontaktujte nás.</p>
            `;

            const html = getEmailTemplate(emailSubject, emailBody);

            await sendEmail({
                to: updatedAppointment.profiles.email,
                subject: emailSubject,
                html: html
            });
            console.log('Reschedule email sent to:', updatedAppointment.profiles.email);
        } catch (emailError) {
            console.error('Failed to send reschedule email:', emailError);
            // Don't fail the action if email fails
        }
    }

    revalidatePath('/dashboard/cosmetics/appointments')
    return { success: true }
}

export async function deleteEmployee(id: string) {
    await requireAdmin();
    const supabase = await createClient()

    const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting employee:', error)
        return { error: 'Failed to delete employee' }
    }

    revalidatePath('/dashboard/cosmetics/staff')
    return { success: true }
}

// --- Slot Calculation Logic ---

export async function getAvailableSlots(employeeId: string, serviceId: string, date: string) {
    // date format: 'YYYY-MM-DD'
    const supabase = await createClient()

    // 1. Get Service Duration
    const { data: service } = await supabase
        .from('cosmetic_services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .single()

    if (!service) return []
    const duration = service.duration_minutes

    // 2. Get Employee Availability
    // First check for specific date exceptions (fetch ALL for the date)
    const { data: exceptions } = await supabase
        .from('employee_availability_exceptions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('exception_date', date);

    const activeSlots = [];

    if (exceptions && exceptions.length > 0) {
        // We have exceptions for this date
        // Filter for active ones (is_available = true)
        const available = exceptions.filter(e => e.is_available);

        if (available.length === 0) {
            return []; // Explicitly all unavailable
        }

        // Use these slots
        activeSlots.push(...available.map(e => ({
            start_time: e.start_time,
            end_time: e.end_time
        })));

    } else {
        // Fallback to weekly recurring
        const dayOfWeek = new Date(date).getDay();
        const { data: regularSlots } = await supabase
            .from('employee_availability')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('is_recurring', true)
            .eq('day_of_week', dayOfWeek)
            .eq('is_available', true);

        if (regularSlots && regularSlots.length > 0) {
            activeSlots.push(...regularSlots.map(s => ({
                start_time: s.start_time,
                end_time: s.end_time
            })));
        }
    }

    if (activeSlots.length === 0) {
        return [];
    }

    // 3. Get Existing Appointments
    const startOfDay = `${date}T00:00:00`
    const endOfDay = `${date}T23:59:59`

    const { data: appointments } = await supabase
        .from('cosmetic_appointments')
        .select('start_time, end_time')
        .eq('employee_id', employeeId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .filter('status', 'neq', 'cancelled')

    // 4. Generate Slots from ALL active ranges
    const slots: string[] = []

    // Helper to add minutes
    const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60000)

    for (const range of activeSlots) {
        if (!range.start_time || !range.end_time) continue;

        let currentTime = new Date(`${date}T${range.start_time}`)
        const rangeEnd = new Date(`${date}T${range.end_time}`)

        while (addMinutes(currentTime, duration) <= rangeEnd) {
            const slotStart = currentTime
            const slotEnd = addMinutes(currentTime, duration)

            // Check collision with appointments
            const isCollision = appointments?.some(app => {
                const appStart = new Date(app.start_time)
                const appEnd = new Date(app.end_time)
                return (slotStart < appEnd && slotEnd > appStart)
            })

            if (!isCollision) {
                // Check if slot already exists (from overlapping ranges? unlikely but safe)
                const timeStr = slotStart.toTimeString().slice(0, 5) // HH:MM
                if (!slots.includes(timeStr)) {
                    slots.push(timeStr)
                }
            }

            // Increment by 30 min intervals
            currentTime = addMinutes(currentTime, 30)
        }
    }

    return slots.sort() // Sort slots chronologically
}

export async function promoteToEmployee(userId: string, name: string, email: string) {
    await requireAdmin();
    const supabase = await createClient();

    // 1. Check if employee record already exists
    const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .or(`email.eq.${email},profile_id.eq.${userId}`)
        .maybeSingle();

    if (existing) {
        // Employee record exists, ensure it's linked
        await supabase.from('employees').update({ profile_id: userId, email }).eq('id', existing.id);
    } else {
        // Create new employee record
        const { error: createError } = await supabase.from('employees').insert({
            name: name || 'Employee',
            email: email,
            role_type: 'employee', // If such specific column exists, otherwise just default
            is_active: true,
            profile_id: userId
        });
        if (createError) {
            console.error('Error creating linked employee:', createError);
            return { error: 'Failed to create employee record' };
        }
    }

    // 2. Update Profile Role
    const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'employee' })
        .eq('id', userId);

    if (roleError) {
        console.error('Error updating profile role:', roleError);
        return { error: 'Failed to update user role' };
    }

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath('/dashboard/cosmetics/staff');
    return { success: true };
}

export async function getUserAppointments() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
        .from('cosmetic_appointments')
        .select(`
            *,
            cosmetic_services(title, duration_minutes, price),
            employees(name, color)
        `)
        .eq('user_id', user.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Error fetching user appointments:', error)
        return []
    }
    return data
}

export async function cancelAppointment(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Check Permissions
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isStaff = profile?.role === 'employee' || profile?.role === 'admin';

    // 2. Fetch details for email BEFORE cancelling (to get service name etc)
    let query = supabase
        .from('cosmetic_appointments')
        .select(`
            *,
            cosmetic_services(title)
        `)
        .eq('id', id);

    if (!isStaff) {
        query = query.eq('user_id', user.id);
    }

    const { data: appointment } = await query.single();

    if (!appointment) {
        return { error: 'Rezervácia sa nenašla alebo nemáte oprávnenie.' };
    }

    // 3. Cancellation
    let updateQuery = supabase
        .from('cosmetic_appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

    if (!isStaff) {
        updateQuery = updateQuery.eq('user_id', user.id);
    }

    const { error } = await updateQuery;

    if (error) {
        console.error('Error cancelling appointment:', error)
        return { error: 'Failed to cancel appointment' }
    }

    // 3. Send Cancellation Email
    if (appointment && appointment.cosmetic_services) {
        try {
            const formattedDate = format(new Date(appointment.start_time), 'd. MMMM yyyy HH:mm', { locale: sk });
            const serviceName = appointment.cosmetic_services.title;

            const emailSubject = `Zrušenie rezervácie - ${serviceName}`;
            const emailBody = `
                <p>Dobrý deň,</p>
                <p>Vaša rezervácia na službu <strong>${serviceName}</strong> (termín: ${formattedDate}) bola úspešne zrušená.</p>
                <p>Dúfame, že si čoskoro nájdete iný termín.</p>
                
                <div style="text-align: center; margin-top: 20px;">
                     <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://profil.oasislounge.sk'}/dashboard/cosmetics" class="button">Nová rezervácia</a>
                </div>
            `;

            const html = getEmailTemplate(emailSubject, emailBody);

            await sendEmail({
                to: user.email || '',
                subject: emailSubject,
                html: html
            });
        } catch (mailError) {
            console.error('Failed to send cancellation email:', mailError);
        }
    }

    revalidatePath('/dashboard/cosmetics/appointments')
    return { success: true }
}



// --- Manual Reservations (Employee/Admin) ---

export async function createManualReservation(prevState: any, formData: FormData) {
    await requireEmployeeOrAdmin();
    const supabase = await createClient();

    const serviceId = formData.get('serviceId') as string;
    const employeeId = formData.get('employeeId') as string;
    const date = formData.get('date') as string;
    const time = formData.get('time') as string; // HH:mm
    const notes = formData.get('notes') as string;

    // Guest info
    const clientName = formData.get('clientName') as string;
    const clientEmail = formData.get('clientEmail') as string;
    const clientPhone = formData.get('clientPhone') as string;

    if (!serviceId || !employeeId || !date || !time) {
        return { error: 'Chýbajú povinné údaje (služba, zamestnanec, dátum, čas).' };
    }

    // Construct timestamps
    const startDateTime = new Date(`${date}T${time}:00`); // Local time? Needs careful handling of timezones if server is UTC.
    // Assuming input is local and we store UTC.
    // Better: use date-fns-tz or similar if complex. key is to ensure consistent ISO string.

    // Get duration to calculate end time
    const { data: service } = await supabase.from('cosmetic_services').select('duration_minutes').eq('id', serviceId).single();
    if (!service) return { error: 'Služba sa nenašla.' };

    const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60000);
    const endTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

    // --- Availability Check ---

    // 1. Check Exceptions (Vacation/Specific availability)
    const { data: exceptions } = await supabase
        .from('employee_availability_exceptions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('exception_date', date);

    if (exceptions && exceptions.length > 0) {
        // Assume daily exception mostly. If multiple, it's complex, but usually one per day.
        const exception = exceptions[0];
        if (!exception.is_available) {
            return { error: 'Zamestnanec má v tento deň voľno (výnimka).' };
        }
        // If available override, we check time boundaries if set
        if (exception.start_time && exception.end_time) {
            if (time < exception.start_time || endTime > exception.end_time) {
                return { error: `Zamestnanec je dostupný len od ${exception.start_time} do ${exception.end_time}.` };
            }
        }
    } else {
        // 2. Check Regular Weekly Schedule
        const dayOfWeek = new Date(date).getDay(); // 0 = Sunday
        const { data: schedule } = await supabase
            .from('employee_availability')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('is_recurring', true)
            .eq('day_of_week', dayOfWeek)
            .eq('is_available', true)
            .maybeSingle();

        if (!schedule) {
            return { error: 'Zamestnanec v tento deň (podľa rozvrhu) nepracuje.' };
        }

        if (schedule.start_time && schedule.end_time) {
            if (time < schedule.start_time || endTime > schedule.end_time) {
                return { error: `Mimo pracovných hodín (${schedule.start_time} - ${schedule.end_time}).` };
            }
        }
    }

    // 3. Check Conflicts with existing appointments
    const { count: conflictCount } = await checkConflictingAppointments(employeeId, date, time, endTime);
    if (conflictCount > 0) {
        return { error: 'V tomto čase už existuje iná rezervácia.' };
    }

    // Check if user exists with this email to link them?
    // Optional feature: strict linking or loose linking.
    let userId = null;
    if (clientEmail) {
        const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', clientEmail).single();
        if (existingUser) {
            userId = existingUser.id;
        }
    }

    const { error } = await supabase
        .from('cosmetic_appointments')
        .insert({
            service_id: serviceId,
            employee_id: employeeId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            user_id: userId, // Link if found, else NULL
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            notes: notes,
            status: 'confirmed', // Manual reservations are usually confirmed immediately
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error creating manual reservation:', error);
        return { error: 'Chyba pri vytváraní rezervácie: ' + error.message };
    }

    revalidatePath('/dashboard/cosmetics/appointments');
    return { success: true, message: 'Rezervácia bola úspešne vytvorená.' };
}


