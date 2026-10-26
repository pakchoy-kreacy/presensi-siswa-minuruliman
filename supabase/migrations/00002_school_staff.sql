-- Daftar guru sekolah dan PIN-nya. Hanya diakses server (api/staff.js, service role).
CREATE TABLE IF NOT EXISTS public.school_staff (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nama TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  kelas_id BIGINT,
  aktif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.school_staff FROM anon, authenticated;
