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
| `RESEND_API_KEY` | API key Resend untuk kirim kode OTP lewat email |
| `OTP_FROM_EMAIL` | alamat pengirim OTP (domain harus terverifikasi di Resend) |
| `ALLOWED_EMAILS` | opsional: daftar email yang boleh memakai cloud, dipisah koma. Kosong = semua email yang lolos OTP |

## Database

Jalankan `supabase/migrations/00001_baseline.sql` pada project Supabase sekolah (SQL Editor). File ini sudah memuat tabel, RLS yang dikunci ke pemilik data, dan fungsi rate limit OTP.
