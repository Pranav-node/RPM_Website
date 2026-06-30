-- ============================================================
--  RPM Motor Works — Supabase Setup Script
--  Paste this entire file into:
--  Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. CREATE BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  brand       TEXT NOT NULL,
  model       TEXT,
  service     TEXT NOT NULL,
  date        TEXT,
  time        TEXT,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. POLICY: Anyone can INSERT a booking (public form submission)
CREATE POLICY "Allow public insert"
  ON public.bookings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 4. POLICY: Only authenticated users (admin) can SELECT bookings
CREATE POLICY "Allow admin select"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. POLICY: Only authenticated users (admin) can UPDATE bookings
CREATE POLICY "Allow admin update"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. POLICY: Only authenticated users (admin) can DELETE bookings
CREATE POLICY "Allow admin delete"
  ON public.bookings
  FOR DELETE
  TO authenticated
  USING (true);

-- 7. CREATE INDEX for faster queries
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings (status);

-- Done! Verify by running: SELECT * FROM public.bookings;
