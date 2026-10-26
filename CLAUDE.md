Presensi Siswa MI Nurul Iman — Vite + React + TypeScript PWA, dipakai satu sekolah (semua fitur terbuka, tanpa paket/lisensi).

- Data lokal: Dexie/IndexedDB (`src/repositories/dexie`).
- Backend: Supabase (auth email OTP, Postgres + RLS) dan Vercel serverless di `api/*.js` (login cloud, absen mandiri); kode OTP dikirim email bawaan Supabase Auth.
- Skema dan RLS ada di `supabase/migrations/00001_baseline.sql`; perubahan berikutnya ditambah sebagai file migration baru.
- Cek sebelum push: `npx tsc --noEmit` dan `npx vite build`.

## Hemat deploy Vercel

- Kuota deploy Vercel (Hobby) 100 per hari untuk seluruh tim, dipakai bersama project lain di akun yang sama.
- Branch selain `main` tidak di-build (`ignoreCommand` di `vercel.json`). Pakai branch kerja untuk perubahan yang belum final.
- Gabungkan perubahan kecil jadi satu push ke `main`. Jangan push per commit kecil.
- Push ke `main` hanya untuk perubahan yang siap tayang. Perbaikan teks atau rapi-rapi ditunda dan digabung dengan perubahan berikutnya, kecuali ada masalah mendesak.
- Jangan memicu deploy ulang tanpa kebutuhan (commit kosong, redeploy berulang).
