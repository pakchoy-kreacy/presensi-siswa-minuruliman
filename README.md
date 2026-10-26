# Presensi Siswa MI Nurul Iman

Aplikasi presensi siswa (PWA) untuk satu sekolah. Data tersimpan di HP (IndexedDB) dan bisa disinkronkan ke cloud lewat Supabase.

## Menjalankan

```bash
npm install
npm run dev
```

## Deploy ke Vercel

Build command `npm run build`, output `dist` (sudah diatur di `vercel.json`). Isi environment variable berikut di project Vercel:

| Variabel | Keterangan |
| --- | --- |
| `VITE_SUPABASE_URL` | URL project Supabase sekolah |
| `VITE_SUPABASE_ANON_KEY` | anon key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (hanya untuk fungsi `api/*`) |
| `ALLOWED_EMAILS` | opsional: daftar email yang boleh memakai cloud, dipisah koma. Kosong = semua email yang lolos OTP |

## Database

Jalankan `supabase/migrations/00001_baseline.sql` pada project Supabase sekolah (SQL Editor). File ini sudah memuat tabel, RLS yang dikunci ke pemilik data, dan fungsi rate limit OTP.

## Email kode masuk (OTP)

Kode dikirim oleh email bawaan Supabase Auth. Di Supabase → Authentication → Emails → template **Magic Link**, pastikan isinya memuat `{{ .Token }}` (kode 6 digit), misalnya:

```html
<h2>Kode masuk Presensi MI Nurul Iman</h2>
<p>Masukkan kode ini di aplikasi:</p>
<h1>{{ .Token }}</h1>
```

Email bawaan Supabase dibatasi beberapa email per jam. Kalau guru sering gagal menerima kode, pasang SMTP sendiri di Authentication → SMTP Settings.
