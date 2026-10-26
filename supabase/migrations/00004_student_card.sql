-- Data kartu pelajar (tempat & tanggal lahir, foto terkompres) dan pencarian NISN untuk portal orang tua.
ALTER TABLE public.cloud_students
  ADD COLUMN IF NOT EXISTS tempat_lahir TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_lahir TEXT,
  ADD COLUMN IF NOT EXISTS foto TEXT;
CREATE INDEX IF NOT EXISTS idx_cloud_students_nisn ON public.cloud_students(nisn);
