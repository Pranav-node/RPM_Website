-- ============================================================
--  RPM Motor Workks — Fix: Allow anon to read bookings
--  Paste this into Supabase SQL Editor and click Run
-- ============================================================

-- Drop old restrictive SELECT policy
DROP POLICY IF EXISTS "Allow admin select" ON public.bookings;

-- New policy: anyone can read bookings (admin panel handles auth via UI)
CREATE POLICY "Allow all select"
  ON public.bookings
  FOR SELECT
  USING (true);

-- Also allow anon to update status (admin panel uses anon key)
DROP POLICY IF EXISTS "Allow admin update" ON public.bookings;
CREATE POLICY "Allow all update"
  ON public.bookings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Done! Now the admin panel can read and update bookings.
