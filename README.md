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

## Database

Jalankan file di `supabase/migrations` berurutan (00001, 00002, …) pada project Supabase sekolah lewat SQL Editor.

## Cara masuk

- **Admin**: buka aplikasi → tab Admin → masuk dengan PIN admin atau kode yang dikirim ke email admin (tabel `school_settings`). PIN admin bisa diganti di menu Kelola Guru. Saat pertama kali, data sekolah dibuat otomatis. Lalu tambah kelas & siswa (menu Siswa) dan guru (menu Kelola Guru).
- **Guru**: pilih nama → ketik PIN dari admin. Guru bisa mengubah kelas walinya; kelas lain hanya bisa dilihat.
- Semua HP memakai satu akun cloud sekolah, jadi data tersinkron ke semua guru. Email hanya dipakai untuk kode masuk admin, lewat email bawaan Supabase Auth: template **Magic Link** di Authentication → Emails harus memuat `{{ .Token }}`.
