DO $$
BEGIN
    DROP POLICY IF EXISTS "Employees and Admins can manage all appointments" ON public.cosmetic_appointments;
    
    CREATE POLICY "Employees and Admins can manage all appointments"
    ON public.cosmetic_appointments
    FOR ALL
    USING (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role in ('employee', 'admin')
      )
    );
END
$$;
