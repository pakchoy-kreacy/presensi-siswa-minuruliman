import { createClient } from "@supabase/supabase-js";

// Portal orang tua (hanya baca): cari siswa dari NISN, kembalikan kehadiran ±6 bulan terakhir.
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function limited(supabase, key, max, windowS) {
  const { data, error } = await supabase.rpc("rate_hit", { p_key: key, p_max: max, p_window_s: windowS });
  return !error && data === true;
}

const STATUS = ["H", "S", "I", "A", "T"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const nisn = String((req.body || {}).nisn || "").replace(/\D/g, "");
  if (!/^\d{10}$/.test(nisn)) return res.status(400).json({ error: "NISN harus 10 angka." });

  try {
    const supabase = getSupabase();
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
    if ((await limited(supabase, "ortu-ip:" + ip, 20, 3600)) || (await limited(supabase, "ortu-nisn:" + nisn, 10, 3600))) {
      return res.status(429).json({ error: "Terlalu sering. Coba lagi 1 jam lagi." });
    }

    const { data: siswa } = await supabase
      .from("cloud_students")
      .select("user_id, local_id, kelas_id, nama, foto")
      .eq("nisn", nisn)
      .eq("status_aktif", true)
      .order("diubah_pada", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!siswa) return res.status(404).json({ error: "NISN tidak ditemukan. Periksa lagi atau hubungi admin sekolah." });

    const { data: kelas } = await supabase
      .from("cloud_classrooms")
      .select("nama")
      .eq("user_id", siswa.user_id)
      .eq("local_id", siswa.kelas_id)
      .maybeSingle();

    const sejak = new Date(Date.now() - 183 * 86400000).toISOString().slice(0, 10);
    const { data: sesi } = await supabase
      .from("cloud_attendance_sessions")
      .select("local_id, tanggal")
      .eq("user_id", siswa.user_id)
      .eq("kelas_id", siswa.kelas_id)
      .gte("tanggal", sejak);
    const tanggalSesi = new Map((sesi || []).map((s) => [s.local_id, s.tanggal]));

    let catatan = [];
    if (tanggalSesi.size) {
      const { data } = await supabase
        .from("cloud_attendance_records")
        .select("sesi_id, status, catatan")
        .eq("user_id", siswa.user_id)
        .eq("siswa_id", siswa.local_id)
        .in("sesi_id", [...tanggalSesi.keys()]);
      catatan = data || [];
    }

    const riwayat = catatan
      .filter((r) => STATUS.includes(r.status) && tanggalSesi.has(r.sesi_id))
      .map((r) => ({ tanggal: tanggalSesi.get(r.sesi_id), status: r.status, catatan: r.catatan || null }))
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));

    return res.status(200).json({ nama: siswa.nama, kelas: kelas?.nama || "-", foto: siswa.foto || null, riwayat });
  } catch (e) {
    console.error("ortu error:", e);
    return res.status(500).json({ error: "Gagal memuat data. Coba lagi." });
  }
}
