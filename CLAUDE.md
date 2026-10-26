Presensi Siswa MI Nurul Iman — Vite + React + TypeScript PWA, dipakai satu sekolah (semua fitur terbuka, tanpa paket/lisensi).

- Data lokal: Dexie/IndexedDB (`src/repositories/dexie`).
- Backend: Supabase (auth email OTP, Postgres + RLS) dan Vercel serverless di `api/*.js` (OTP lewat Resend, login cloud, absen mandiri).
- Perubahan skema/RLS dicatat sebagai SQL di `supabase/migrations` dan `scripts/`.
- Cek sebelum push: `npx tsc --noEmit` dan `npx vite build`.
