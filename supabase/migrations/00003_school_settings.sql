-- Pengaturan sekolah (PIN admin dalam bentuk hash, email admin). Hanya diakses server (api/staff.js).
CREATE TABLE IF NOT EXISTS public.school_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.school_settings (key, value) VALUES ('admin_email', 'minurulimankabojaya@gmail.com')
ON CONFLICT (key) DO NOTHING;
-- PIN admin awal (admin_pin_hash) diisi terpisah, lalu diganti admin dari menu Kelola Guru.
