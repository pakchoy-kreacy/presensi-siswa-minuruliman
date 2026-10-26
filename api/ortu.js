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
  const body = req.body || {};

  try {
    const supabase = getSupabase();
    const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

    // Daftar kelas & nama siswa untuk dipilih orang tua (tanpa NISN atau data lain).
    if (body.action === "kelas" || body.action === "siswa") {
      if (await limited(supabase, "ortu-daftar:" + ip, 60, 3600)) return res.status(429).json({ error: "Terlalu sering. Coba lagi nanti." });
      if (body.action === "kelas") {
        const { data } = await supabase.from("cloud_classrooms").select("local_id, nama").eq("status_aktif", true).order("nama");
        return res.status(200).json({ kelas: (data || []).map((k) => ({ id: k.local_id, nama: k.nama })) });
      }
      const kelasId = Number(body.kelasId);
      if (!Number.isFinite(kelasId)) return res.status(400).json({ error: "Kelas tidak dikenal." });
      const { data } = await supabase.from("cloud_students").select("local_id, nama").eq("kelas_id", kelasId).eq("status_aktif", true).order("nama");
      return res.status(200).json({ siswa: (data || []).map((x) => ({ id: x.local_id, nama: x.nama })) });
    }

    // Cari anak lewat sebagian nama (semua kelas).
    if (body.action === "cari") {
      if (await limited(supabase, "ortu-daftar:" + ip, 60, 3600)) return res.status(429).json({ error: "Terlalu sering. Coba lagi nanti." });
      const nama = String(body.nama || "").replace(/[%_,()\\]/g, " ").trim().slice(0, 40);
      if (nama.length < 2) return res.status(400).json({ error: "Ketik minimal 2 huruf nama anak." });
      const { data } = await supabase.from("cloud_students").select("local_id, nama, kelas_id").eq("status_aktif", true).ilike("nama", "%" + nama + "%").order("nama").limit(20);
      const ids = [...new Set((data || []).map((x) => x.kelas_id))];
      const { data: kls } = ids.length ? await supabase.from("cloud_classrooms").select("local_id, nama").in("local_id", ids) : { data: [] };
      const namaKelas = new Map((kls || []).map((k) => [k.local_id, k.nama]));
      return res.status(200).json({ siswa: (data || []).map((x) => ({ id: x.local_id, nama: x.nama, kelas: namaKelas.get(x.kelas_id) || "-" })) });
    }

    // Lihat kehadiran: lewat NISN atau id siswa (dari pilihan kelas & nama).
    const nisn = String(body.nisn || "").replace(/\D/g, "");
    const siswaId = Number(body.siswaId);
    const pakaiId = !nisn && Number.isFinite(siswaId) && siswaId > 0;
    if (!pakaiId && !/^\d{4,20}$/.test(nisn)) return res.status(400).json({ error: "Periksa lagi NISN anak (hanya angka)." });
    const kunci = pakaiId ? "id:" + siswaId : nisn;
    if ((await limited(supabase, "ortu-ip:" + ip, 40, 3600)) || (await limited(supabase, "ortu-nisn:" + kunci, 20, 3600))) {
      return res.status(429).json({ error: "Terlalu sering. Coba lagi 1 jam lagi." });
    }

    let q = supabase.from("cloud_students").select("user_id, local_id, kelas_id, nama, nisn, foto").eq("status_aktif", true);
    q = pakaiId ? q.eq("local_id", siswaId) : q.eq("nisn", nisn);
    const { data: siswa } = await q.order("diubah_pada", { ascending: false }).limit(1).maybeSingle();
    if (!siswa) return res.status(404).json({ error: pakaiId ? "Data anak tidak ditemukan." : "NISN tidak ditemukan. Periksa lagi atau hubungi admin sekolah." });

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

    return res.status(200).json({ id: siswa.local_id, nama: siswa.nama, nisn: siswa.nisn || null, kelas: kelas?.nama || "-", foto: siswa.foto || null, riwayat });
  } catch (e) {
    console.error("ortu error:", e);
    return res.status(500).json({ error: "Gagal memuat data. Coba lagi." });
  }
}
