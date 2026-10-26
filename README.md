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
| `ADMIN_PIN` | PIN admin sekolah (4–6 angka), dipakai masuk sebagai Admin |

## Database

Jalankan file di `supabase/migrations` berurutan (00001, 00002, …) pada project Supabase sekolah lewat SQL Editor.

## Cara masuk

- **Admin**: buka aplikasi → tab Admin → ketik `ADMIN_PIN`. Saat pertama kali, data sekolah dibuat otomatis. Lalu tambah kelas & siswa (menu Siswa) dan guru (menu Kelola Guru).
- **Guru**: pilih nama → ketik PIN dari admin. Guru bisa mengubah kelas walinya; kelas lain hanya bisa dilihat.
- Semua HP memakai satu akun cloud sekolah, jadi data tersinkron ke semua guru. Tidak ada email yang dikirim.
