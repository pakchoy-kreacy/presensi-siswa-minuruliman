-- ============================================
-- BASELINE SKEMA: Presensi Siswa MI Nurul Iman
-- Satu file, kondisi akhir (RLS sudah dikunci ke pemilik data).
-- Jalankan di SQL Editor project Supabase yang baru.
-- ============================================


-- ============================================
-- PROFILES (standalone, no FK to auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: UPSERT on new auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, name, tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'tier', 'FREE')
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE public.profiles.name END,
    tier = CASE WHEN public.profiles.tier = 'FREE' AND EXCLUDED.tier = 'PRO' THEN 'PRO' ELSE public.profiles.tier END,
    updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- LOCAL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.schools (
  id BIGINT PRIMARY KEY,
  nama TEXT NOT NULL,
  jenjang TEXT NOT NULL,
  logo_url TEXT,
  alamat TEXT,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id BIGINT PRIMARY KEY,
  user_id UUID,
  nama TEXT NOT NULL,
  email TEXT NOT NULL,
  sekolah_id BIGINT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'FREE',
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.academic_years (
  id BIGINT PRIMARY KEY,
  guru_id BIGINT NOT NULL,
  label TEXT NOT NULL,
  tanggal_mulai TEXT NOT NULL,
  tanggal_selesai TEXT NOT NULL,
  semester_aktif TEXT NOT NULL,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.classrooms (
  id BIGINT PRIMARY KEY,
  tahun_ajaran_id BIGINT NOT NULL,
  guru_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.students (
  id BIGINT PRIMARY KEY,
  kelas_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  nisn TEXT,
  jenis_kelamin TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id BIGINT PRIMARY KEY,
  kelas_id BIGINT NOT NULL,
  tanggal TEXT NOT NULL,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id BIGINT PRIMARY KEY,
  sesi_id BIGINT NOT NULL,
  siswa_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  catatan TEXT,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.calendar_entries (
  id BIGINT PRIMARY KEY,
  tahun_ajaran_id BIGINT NOT NULL,
  tanggal TEXT NOT NULL,
  jenis TEXT NOT NULL,
  keterangan TEXT,
  sumber TEXT NOT NULL,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.backups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guru_id BIGINT NOT NULL,
  data TEXT NOT NULL,
  label TEXT NOT NULL,
  total_entitas INTEGER NOT NULL DEFAULT 0,
  dibuat_pada BIGINT NOT NULL DEFAULT 0
);

-- ============================================
-- CLOUD SYNC TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.sync_metadata (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'idle',
  error_message TEXT,
  total_records INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.cloud_schools (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  jenjang TEXT NOT NULL,
  logo_url TEXT,
  alamat TEXT,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_teachers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  email TEXT NOT NULL,
  sekolah_id BIGINT NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'FREE',
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_academic_years (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  guru_id BIGINT NOT NULL,
  label TEXT NOT NULL,
  tanggal_mulai TEXT NOT NULL,
  tanggal_selesai TEXT NOT NULL,
  semester_aktif TEXT NOT NULL,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_classrooms (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  tahun_ajaran_id BIGINT NOT NULL,
  guru_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_students (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  kelas_id BIGINT NOT NULL,
  nama TEXT NOT NULL,
  nisn TEXT,
  jenis_kelamin TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_attendance_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  kelas_id BIGINT NOT NULL,
  tanggal TEXT NOT NULL,
  dibuat_pada BIGINT NOT NULL DEFAULT 0,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_attendance_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  sesi_id BIGINT NOT NULL,
  siswa_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  catatan TEXT,
  diubah_pada BIGINT NOT NULL DEFAULT 0,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.cloud_calendar_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  local_id BIGINT NOT NULL,
  tahun_ajaran_id BIGINT NOT NULL,
  tanggal TEXT NOT NULL,
  jenis TEXT NOT NULL,
  keterangan TEXT,
  sumber TEXT NOT NULL,
  last_synced_at BIGINT NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.sync_queue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  local_id BIGINT NOT NULL,
  operation TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  retries INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.cloud_backups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  total_entitas INTEGER NOT NULL DEFAULT 0,
  label TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.cloud_tombstones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  local_id BIGINT NOT NULL,
  deleted_at BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.devices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  device_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_active_at BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(user_id, device_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_cloud_schools_user_id ON public.cloud_schools(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_teachers_user_id ON public.cloud_teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_academic_years_user_id ON public.cloud_academic_years(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_classrooms_user_id ON public.cloud_classrooms(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_students_user_id ON public.cloud_students(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_att_sessions_user_id ON public.cloud_attendance_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_att_records_user_id ON public.cloud_attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_cloud_calendar_entries_user_id ON public.cloud_calendar_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_students_kelas_id ON public.students(kelas_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_kelas_id ON public.attendance_sessions(kelas_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_tanggal ON public.attendance_sessions(tanggal);
CREATE INDEX IF NOT EXISTS idx_attendance_records_sesi_id ON public.attendance_records(sesi_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_tanggal ON public.calendar_entries(tanggal);
CREATE INDEX IF NOT EXISTS idx_classrooms_guru_id ON public.classrooms(guru_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_guru_id ON public.academic_years(guru_id);

-- ============================================
-- RLS: ENABLE ON ALL TABLES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cloud_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (open for import phase, tighten later)
-- ============================================
CREATE POLICY pol_schools ON public.schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_teachers ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_academic_years ON public.academic_years FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_classrooms ON public.classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_students ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_attendance_sessions ON public.attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_attendance_records ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_calendar_entries ON public.calendar_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_backups ON public.backups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_sync_metadata ON public.sync_metadata FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_schools ON public.cloud_schools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_teachers ON public.cloud_teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_academic_years ON public.cloud_academic_years FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_classrooms ON public.cloud_classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_students ON public.cloud_students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_att_sessions ON public.cloud_attendance_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_att_records ON public.cloud_attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_calendar ON public.cloud_calendar_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_sync_queue ON public.sync_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_backups ON public.cloud_backups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_cloud_tombstones ON public.cloud_tombstones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY pol_devices ON public.devices FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY pol_profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY pol_profiles_update ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY pol_profiles_insert ON public.profiles FOR INSERT WITH CHECK (true);

-- ============================================
-- PENGATURAN GURU (tersinkron cloud)
-- ============================================
CREATE TABLE IF NOT EXISTS public.teacher_settings (
  email TEXT PRIMARY KEY,
  hari_aktif_mode TEXT NOT NULL DEFAULT 'Senin-Sabtu',
  hari_aktif_custom TEXT,
  updated_at BIGINT NOT NULL DEFAULT 0
);
ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ABSEN MANDIRI SISWA
-- ============================================
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS absen_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_students_absen_token ON public.students(absen_token);
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS allow_siswa_absen_mandiri BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.cloud_students ADD COLUMN IF NOT EXISTS absen_token TEXT;
CREATE INDEX IF NOT EXISTS idx_cloud_students_absen_token ON public.cloud_students(absen_token);
ALTER TABLE public.cloud_classrooms ADD COLUMN IF NOT EXISTS allow_siswa_absen_mandiri BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- UNIQUE (user_id, local_id): cegah baris dobel di tabel cloud
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_records_uid_local ON public.cloud_attendance_records(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_sessions_uid_local ON public.cloud_attendance_sessions(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_students_uid_local ON public.cloud_students(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_classrooms_uid_local ON public.cloud_classrooms(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_schools_uid_local ON public.cloud_schools(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_teachers_uid_local ON public.cloud_teachers(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_ay_uid_local ON public.cloud_academic_years(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_calendar_uid_local ON public.cloud_calendar_entries(user_id, local_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cloud_tombstones ON public.cloud_tombstones(user_id, entity_type, local_id);

-- ============================================
-- RATE LIMIT OTP (dipakai api/otp.js lewat service role)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_hits (key TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS rate_hits_key_at ON public.rate_hits(key, at);
ALTER TABLE public.rate_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_hits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.rate_hit(p_key TEXT, p_max INT, p_window_s INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  IF random() < 0.01 THEN DELETE FROM rate_hits WHERE at < now() - interval '1 day'; END IF;
  SELECT count(*) INTO n FROM rate_hits WHERE key = p_key AND at > now() - make_interval(secs => p_window_s);
  IF n >= p_max THEN RETURN true; END IF;
  INSERT INTO rate_hits(key) VALUES (p_key);
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.rate_hit(TEXT, INT, INT) FROM PUBLIC, anon, authenticated;

-- ============================================
-- KUNCI RLS: data cloud hanya bisa diakses pemiliknya
-- setelah login kode email (OTP).
-- Nama policy lama dipertahankan; ekspresinya diubah dengan ALTER POLICY.
-- Server (api/*.js, service role) tidak terpengaruh RLS.

-- Prasyarat
alter table public.profiles add column if not exists auth_id uuid;
create unique index if not exists profiles_auth_id_key on public.profiles(auth_id);
create or replace function public.my_profile_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where auth_id = auth.uid() limit 1
$$;
revoke all on function public.my_profile_id() from public;
grant execute on function public.my_profile_id() to authenticated;

-- profiles: baca baris sendiri; insert/update hanya lewat server (tier tidak bisa diubah dari browser)
alter policy pol_profiles_select on public.profiles using (auth_id = auth.uid());
alter policy pol_profiles_update on public.profiles using (false) with check (false);
alter policy pol_profiles_insert on public.profiles with check (false);
create policy profiles_select_own on public.profiles for select to authenticated using (auth_id = auth.uid());

-- devices: lihat & keluarkan perangkat sendiri; daftar perangkat baru hanya lewat api/cloud-login
alter policy pol_devices on public.devices using (user_id = public.my_profile_id()) with check (false);

-- teacher_settings: per email yang sedang login
create policy teacher_settings_own on public.teacher_settings for all to authenticated
  using (lower(email) = lower(auth.email())) with check (lower(email) = lower(auth.email()));

-- tabel cloud_*
alter policy pol_cloud_students on public.cloud_students using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_classrooms on public.cloud_classrooms using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_att_sessions on public.cloud_attendance_sessions using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_att_records on public.cloud_attendance_records using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_teachers on public.cloud_teachers using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_schools on public.cloud_schools using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_backups on public.cloud_backups using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_calendar on public.cloud_calendar_entries using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_academic_years on public.cloud_academic_years using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());
alter policy pol_cloud_tombstones on public.cloud_tombstones using (user_id = public.my_profile_id()) with check (user_id = public.my_profile_id());

-- tabel lama (tidak dipakai browser; api/absen.js memakai service role): tutup akses publik
alter policy pol_academic_years on public.academic_years using (false) with check (false);
alter policy pol_attendance_records on public.attendance_records using (false) with check (false);
alter policy pol_attendance_sessions on public.attendance_sessions using (false) with check (false);
alter policy pol_backups on public.backups using (false) with check (false);
alter policy pol_calendar_entries on public.calendar_entries using (false) with check (false);
alter policy pol_classrooms on public.classrooms using (false) with check (false);
alter policy pol_schools on public.schools using (false) with check (false);
alter policy pol_students on public.students using (false) with check (false);
alter policy pol_teachers on public.teachers using (false) with check (false);
alter policy pol_sync_metadata on public.sync_metadata using (false) with check (false);
alter policy pol_sync_queue on public.sync_queue using (false) with check (false);
