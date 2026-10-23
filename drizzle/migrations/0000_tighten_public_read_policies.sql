-- Appointments: the public site checks free times and books through secure database functions,
-- so visitors no longer need to read or insert appointment rows directly.
DROP POLICY IF EXISTS "Public read appointments for conflict check" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;

-- Barbers: visitors see only active barbers; staff see all (needed for past appointments).
DROP POLICY IF EXISTS "Public read barbers" ON public.barbers;
DROP POLICY IF EXISTS "barbers_public_read" ON public.barbers;
CREATE POLICY "barbers_public_read_active" ON public.barbers
  FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY "barbers_staff_read" ON public.barbers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.current_barber_id() IS NOT NULL
    OR user_id = auth.uid()
  );

-- Services: visitors see only active services; staff see all.
DROP POLICY IF EXISTS "Public read services" ON public.services;
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read_active" ON public.services
  FOR SELECT TO anon, authenticated
  USING (active = true);
CREATE POLICY "services_staff_read" ON public.services
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.current_barber_id() IS NOT NULL
  );