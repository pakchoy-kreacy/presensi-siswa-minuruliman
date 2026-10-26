-- Kolom yang dikirim sinkron aplikasi tapi belum ada; tanpa ini tahun ajaran & kalender gagal tersimpan di cloud.
ALTER TABLE public.cloud_academic_years ADD COLUMN IF NOT EXISTS diubah_pada BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.cloud_calendar_entries ADD COLUMN IF NOT EXISTS diubah_pada BIGINT NOT NULL DEFAULT 0;
