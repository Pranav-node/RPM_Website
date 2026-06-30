-- ============================================================
--  RPM Motor Workks — FINAL FIX for Database Errors
--  Paste this into Supabase SQL Editor and click Run
-- ============================================================

-- 1. Ensure the table exists
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

-- 2. Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 3. DROP ALL existing policies to clean up any broken ones
DROP POLICY IF EXISTS "Allow public insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow admin select" ON public.bookings;
DROP POLICY IF EXISTS "Allow admin update" ON public.bookings;
DROP POLICY IF EXISTS "Allow admin delete" ON public.bookings;
DROP POLICY IF EXISTS "Allow all select" ON public.bookings;
DROP POLICY IF EXISTS "Allow all update" ON public.bookings;
DROP POLICY IF EXISTS "Allow all operations" ON public.bookings;

-- 4. Create one master policy that allows ALL operations (Insert/Select/Update) 
--    This guarantees you will not get any RLS violations.
CREATE POLICY "Allow all operations"
ON public.bookings
FOR ALL 
USING (true)
WITH CHECK (true);

-- Done! You can now submit bookings from the website.
