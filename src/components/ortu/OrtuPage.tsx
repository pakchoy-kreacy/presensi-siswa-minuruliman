import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, UserRound } from "lucide-react";
import { APP_BRAND, DEFAULT_LOGO } from "@/lib/constants";
import { TombolWaAdmin } from "@/components/shared/TombolWaAdmin";

type Riwayat = { tanggal: string; status: "H" | "S" | "I" | "A" | "T"; catatan: string | null };
type Data = { nama: string; kelas: string; foto: string | null; riwayat: Riwayat[] };

const NISN_KEY = "presensi_ortu_nisn";
const LABEL: Record<Riwayat["status"], string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", T: "Terlambat" };
const WARNA: Record<Riwayat["status"], string> = { H: "#16a34a", S: "#2563eb", I: "#d97706", A: "#dc2626", T: "#7c3aed" };
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const tglPanjang = (t: string) => {
  const d = new Date(t + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
};

/** Portal orang tua: hanya melihat kehadiran anak lewat NISN. Tidak memakai data lokal aplikasi guru. */
export function OrtuPage() {
  const [nisn, setNisn] = useState(() => localStorage.getItem(NISN_KEY) || "");
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bulan, setBulan] = useState(() => new Date().toISOString().slice(0, 7));

  const cari = async (n = nisn) => {
    setError("");
    if (!/^\d{4,20}$/.test(n)) return setError("Ketik NISN anak (hanya angka).");
    setBusy(true);
    try {
      const res = await fetch("/api/ortu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nisn: n }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Gagal memuat data.");
      localStorage.setItem(NISN_KEY, n);
      setData(d);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (nisn) cari(nisn); }, []); // buka ulang: langsung tampilkan anak terakhir

  const bulanTersedia = useMemo(() => {
    const set = new Set((data?.riwayat || []).map((r) => r.tanggal.slice(0, 7)));
    set.add(new Date().toISOString().slice(0, 7));
    return [...set].sort().reverse();
  }, [data]);

  const isiBulan = (data?.riwayat || []).filter((r) => r.tanggal.startsWith(bulan));
  const rekap = (["H", "S", "I", "A", "T"] as const).map((s) => ({ s, n: isiBulan.filter((r) => r.status === s).length }));
  const hadirPersen = isiBulan.length ? Math.round((isiBulan.filter((r) => r.status === "H" || r.status === "T").length / isiBulan.length) * 100) : null;

  const gantiAnak = () => {
    localStorage.removeItem(NISN_KEY);
    setNisn("");
    setData(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex justify-center px-4 py-6">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-3 mb-5">
          <img src={DEFAULT_LOGO} alt="Logo MI Nurul Iman" className="w-12 h-12" />
          <div>
            <div className="text-[1rem] font-extrabold text-[var(--text)]">{APP_BRAND}</div>
            <div className="text-[0.75rem] text-[var(--text-light)]">Kehadiran siswa untuk orang tua</div>
          </div>
        </div>

        {!data ? (
          <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-4">
            <label className="block text-[0.7rem] font-bold text-[var(--text-light)] mb-1 uppercase">NISN anak</label>
            <input
              inputMode="numeric"
              maxLength={20}
              value={nisn}
              onChange={(e) => setNisn(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && cari()}
              placeholder="Ketik NISN anak"
              className="w-full px-3 py-[11px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.95rem] tracking-[0.15em] outline-none focus:border-[#0ea5a0] mb-3"
            />
            {error && <div className="mb-3 p-2 rounded-lg bg-[#dc2626]/10 text-[#b91c1c] text-[0.75rem]">{error}</div>}
            <button
              onClick={() => cari()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-[11px] rounded-[10px] text-white font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Lihat kehadiran
            </button>
            <ol className="mt-4 mb-0 pl-4 text-[0.72rem] text-[var(--text-light)] leading-relaxed">
              <li>Ketik NISN anak (ada di kartu pelajar atau rapor).</li>
              <li>Tekan <b>Lihat kehadiran</b>.</li>
              <li>Kehadiran tampil per bulan. HP ini akan mengingat NISN-nya.</li>
            </ol>
            <div className="mt-3 text-center">
              <TombolWaAdmin teks="Lupa NISN anak? Chat admin via WhatsApp" pesan="Assalamualaikum, saya orang tua siswa MI Nurul Iman dan lupa NISN anak saya. Nama anak: … Kelas: …" />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-3 flex items-center gap-3">
              {data.foto ? (
                <img src={data.foto} alt={data.nama} className="w-14 h-[74px] rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-[74px] rounded-lg bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-light)]"><UserRound size={26} /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[0.95rem] font-extrabold text-[var(--text)] truncate">{data.nama}</div>
                <div className="text-[0.75rem] text-[var(--text-light)]">{data.kelas} • NISN {nisn}</div>
                <div className="mt-1 flex gap-3">
                  <button onClick={() => cari(nisn)} disabled={busy} className="flex items-center gap-1 text-[0.72rem] font-bold text-[#0d7a8a] bg-transparent border-none p-0 cursor-pointer">
                    <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Muat ulang
                  </button>
                  <button onClick={gantiAnak} className="text-[0.72rem] font-bold text-[var(--text-light)] bg-transparent border-none p-0 cursor-pointer">Ganti anak</button>
                </div>
              </div>
            </div>

            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-3">
              <div className="flex items-center mb-3">
                <div className="flex-1 text-[0.82rem] font-bold">Ringkasan</div>
                <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="text-[0.75rem] px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)]">
                  {bulanTersedia.map((b) => <option key={b} value={b}>{BULAN[Number(b.slice(5)) - 1]} {b.slice(0, 4)}</option>)}
                </select>
              </div>
              {hadirPersen !== null && (
                <div className="mb-3">
                  <div className="flex justify-between text-[0.72rem] mb-1"><span className="text-[var(--text-light)]">Kehadiran bulan ini</span><b className="text-[#16a34a]">{hadirPersen}%</b></div>
                  <div className="h-2 rounded-full bg-[var(--input-bg)] overflow-hidden"><div className="h-full bg-[#16a34a]" style={{ width: `${hadirPersen}%` }} /></div>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2">
                {rekap.map(({ s, n }) => (
                  <div key={s} className="rounded-xl p-2 text-center" style={{ background: WARNA[s] + "1a" }}>
                    <div className="text-[1.1rem] font-extrabold" style={{ color: WARNA[s] }}>{n}</div>
                    <div className="text-[0.6rem] font-semibold text-[var(--text-light)]">{LABEL[s]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-4">
              <div className="text-[0.82rem] font-bold mb-2">Riwayat</div>
              {isiBulan.length === 0 ? (
                <div className="text-[0.75rem] text-[var(--text-light)] py-3 text-center">Belum ada catatan kehadiran di bulan ini.</div>
              ) : (
                isiBulan.map((r) => (
                  <div key={r.tanggal} className="flex items-center gap-2 py-2 border-t border-[var(--border)] first:border-t-0">
                    <div className="flex-1 text-[0.78rem] text-[var(--text)]">{tglPanjang(r.tanggal)}{r.catatan && r.catatan !== "mandiri" ? <span className="text-[var(--text-light)]"> — {r.catatan}</span> : null}</div>
                    <span className="text-[0.7rem] font-bold px-2 py-[3px] rounded-full text-white" style={{ background: WARNA[r.status] }}>{LABEL[r.status]}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <TombolWaAdmin pesan={`Assalamualaikum, saya orang tua${data ? " dari " + data.nama : ""}. Ada yang ingin saya tanyakan soal kehadiran.`} />
        <p className="text-center text-[0.68rem] text-[var(--text-light)] mt-4">Data hanya untuk dilihat dan diperbarui saat guru sinkron. Perubahan kehadiran dilakukan oleh guru.</p>
      </div>
    </div>
  );
}
