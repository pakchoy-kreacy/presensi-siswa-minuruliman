import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, UserRound } from "lucide-react";
import { APP_BRAND, DEFAULT_LOGO } from "@/lib/constants";
import { TombolWaAdmin } from "@/components/shared/TombolWaAdmin";

type Riwayat = { tanggal: string; status: "H" | "S" | "I" | "A" | "T"; catatan: string | null };
type Data = { id: number; nama: string; nisn: string | null; kelas: string; foto: string | null; riwayat: Riwayat[]; bulanIni: string };
type Pilihan = { id: number; nama: string; kelas?: string };
type Kunci = { nisn: string } | { siswaId: number };

const ANAK_KEY = "presensi_ortu_anak";

async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/ortu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Gagal memuat data.");
  return d;
}
const LABEL: Record<Riwayat["status"], string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alfa", T: "Terlambat" };
const WARNA: Record<Riwayat["status"], string> = { H: "#16a34a", S: "#2563eb", I: "#d97706", A: "#dc2626", T: "#7c3aed" };
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const tglPanjang = (t: string) => {
  const d = new Date(t + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
};

/** Portal orang tua: hanya melihat kehadiran anak (pilih kelas & nama, atau NISN). Tidak memakai data lokal aplikasi guru. */
export function OrtuPage() {
  const [nisn, setNisn] = useState("");
  const [cara, setCara] = useState<"nama" | "kelas" | "nisn">("nama");
  const [daftarKelas, setDaftarKelas] = useState<Pilihan[] | null>(null);
  const [kelasId, setKelasId] = useState("");
  const [daftarSiswa, setDaftarSiswa] = useState<Pilihan[] | null>(null);
  const [namaCari, setNamaCari] = useState("");
  const [hasilCari, setHasilCari] = useState<Pilihan[] | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bulan, setBulan] = useState("");

  const lihat = async (kunci: Kunci) => {
    setError("");
    setBusy(true);
    try {
      const d: Data = await api(kunci);
      localStorage.setItem(ANAK_KEY, String(d.id));
      setData(d);
      setBulan(d.bulanIni);
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setBusy(false);
    }
  };

  const cariNama = async () => {
    if (namaCari.trim().length < 2) return setError("Ketik minimal 2 huruf nama anak.");
    setError("");
    setBusy(true);
    try {
      setHasilCari((await api({ action: "cari", nama: namaCari.trim() })).siswa);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cariNisn = () => {
    if (!/^\d{4,20}$/.test(nisn)) return setError("Ketik NISN anak (hanya angka).");
    lihat({ nisn });
  };

  // Buka ulang: langsung tampilkan anak terakhir.
  useEffect(() => {
    const id = Number(localStorage.getItem(ANAK_KEY));
    if (id) lihat({ siswaId: id });
    api({ action: "kelas" }).then((d) => setDaftarKelas(d.kelas)).catch(() => setDaftarKelas([]));
  }, []);

  const pilihKelas = (id: string) => {
    setKelasId(id);
    setDaftarSiswa(null);
    setError("");
    if (id) api({ action: "siswa", kelasId: Number(id) }).then((d) => setDaftarSiswa(d.siswa)).catch((e) => setError(e.message));
  };

  const bulanTersedia = useMemo(() => {
    const set = new Set((data?.riwayat || []).map((r) => r.tanggal.slice(0, 7)));
    if (data) set.add(data.bulanIni);
    return [...set].sort().reverse();
  }, [data]);

  const isiBulan = (data?.riwayat || []).filter((r) => r.tanggal.startsWith(bulan));
  const rekap = (["H", "S", "I", "A", "T"] as const).map((s) => ({ s, n: isiBulan.filter((r) => r.status === s).length }));
  const hadirPersen = isiBulan.length ? Math.round((isiBulan.filter((r) => r.status === "H" || r.status === "T").length / isiBulan.length) * 100) : null;

  const gantiAnak = () => {
    localStorage.removeItem(ANAK_KEY);
    setNisn("");
    setData(null);
    setHasilCari(null);
  };

  const tombolAnakLain = (
    <button onClick={gantiAnak}
      className="w-full min-h-[50px] mb-3 flex items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#0ea5a0] bg-[var(--card-bg)] text-[#0d7a8a] font-bold text-[0.95rem] cursor-pointer">
      <Search size={18} /> Lihat anak lain
    </button>
  );

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
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--input-bg)] mb-4">
              {(["nama", "kelas", "nisn"] as const).map((c) => (
                <button key={c} type="button" onClick={() => { setCara(c); setError(""); }}
                  className={`min-h-[48px] rounded-[10px] text-[0.9rem] font-bold border-none cursor-pointer ${cara === c ? "bg-[var(--card-bg)] text-[#0d7a8a] shadow" : "bg-transparent text-[var(--text-light)]"}`}>
                  {c === "nama" ? "Cari Nama" : c === "kelas" ? "Pilih Kelas" : "NISN"}
                </button>
              ))}
            </div>

            {cara === "nama" ? (
              <>
                <label className="block text-[0.8rem] font-bold text-[var(--text)] mb-2">Nama anak</label>
                <input
                  value={namaCari}
                  onChange={(e) => { setNamaCari(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && cariNama()}
                  placeholder="Ketik nama anak, misal: Ahmad"
                  className="w-full min-h-[54px] px-3 rounded-[12px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[1rem] outline-none focus:border-[#0ea5a0] mb-3"
                />
                <button onClick={cariNama} disabled={busy}
                  className="w-full min-h-[54px] flex items-center justify-center gap-2 rounded-[12px] text-white font-bold text-[1rem] border-none cursor-pointer disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}>
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Cari
                </button>
                {hasilCari && (
                  hasilCari.length === 0 ? (
                    <div className="mt-3 text-[0.85rem] text-[var(--text-light)]">Nama tidak ditemukan. Coba ketik sebagian nama saja.</div>
                  ) : (
                    <>
                      <div className="mt-4 mb-2 text-[0.8rem] font-bold text-[var(--text)]">Ketuk nama anak:</div>
                      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                        {hasilCari.map((x) => (
                          <button key={x.id} onClick={() => lihat({ siswaId: x.id })} disabled={busy}
                            className="w-full min-h-[54px] px-4 rounded-[12px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-left cursor-pointer active:border-[#0ea5a0] flex items-center gap-3">
                            <UserRound size={18} className="text-[#0ea5a0] flex-shrink-0" />
                            <span className="flex-1 text-[1rem] font-semibold text-[var(--text)]">{x.nama}</span>
                            <span className="text-[0.75rem] text-[var(--text-light)]">{x.kelas}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )
                )}
              </>
            ) : cara === "kelas" ? (
              <>
                <label className="block text-[0.8rem] font-bold text-[var(--text)] mb-2">1. Pilih kelas anak</label>
                <select value={kelasId} onChange={(e) => pilihKelas(e.target.value)} className="w-full min-h-[54px] px-3 rounded-[12px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[1rem] mb-4">
                  <option value="">{daftarKelas ? "— Pilih kelas —" : "Memuat kelas…"}</option>
                  {(daftarKelas || []).map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                </select>
                {kelasId && (
                  <>
                    <label className="block text-[0.8rem] font-bold text-[var(--text)] mb-2">2. Ketuk nama anak</label>
                    {!daftarSiswa ? (
                      <div className="flex items-center gap-2 text-[0.85rem] text-[var(--text-light)] py-3"><Loader2 size={16} className="animate-spin" /> Memuat nama…</div>
                    ) : daftarSiswa.length === 0 ? (
                      <div className="text-[0.85rem] text-[var(--text-light)] py-3">Belum ada siswa di kelas ini.</div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
                        {daftarSiswa.map((x) => (
                          <button key={x.id} onClick={() => lihat({ siswaId: x.id })} disabled={busy}
                            className="w-full min-h-[54px] px-4 rounded-[12px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-left text-[1rem] font-semibold text-[var(--text)] cursor-pointer active:border-[#0ea5a0] flex items-center gap-3">
                            <UserRound size={18} className="text-[#0ea5a0] flex-shrink-0" /> {x.nama}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <label className="block text-[0.8rem] font-bold text-[var(--text)] mb-2">NISN anak</label>
                <input
                  inputMode="numeric"
                  maxLength={20}
                  value={nisn}
                  onChange={(e) => { setNisn(e.target.value.replace(/\D/g, "")); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && cariNisn()}
                  placeholder="Ketik NISN anak"
                  className="w-full min-h-[54px] px-3 rounded-[12px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[1.05rem] tracking-[0.1em] outline-none focus:border-[#0ea5a0] mb-3"
                />
                <button
                  onClick={cariNisn}
                  disabled={busy}
                  className="w-full min-h-[54px] flex items-center justify-center gap-2 rounded-[12px] text-white font-bold text-[1rem] border-none cursor-pointer disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
                >
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />} Lihat kehadiran
                </button>
                <p className="mt-3 mb-0 text-[0.75rem] text-[var(--text-light)]">NISN ada di kartu pelajar atau rapor.</p>
              </>
            )}

            {busy && cara !== "nisn" && <div className="flex items-center gap-2 text-[0.85rem] text-[var(--text-light)] mt-3"><Loader2 size={16} className="animate-spin" /> Memuat kehadiran…</div>}
            {error && <div className="mt-3 p-3 rounded-lg bg-[#dc2626]/10 text-[#b91c1c] text-[0.85rem]">{error}</div>}
            <div className="mt-4 text-center">
              <TombolWaAdmin teks="Nama anak tidak ada? Hubungi admin madrasah" pesan="Assalamualaikum, saya orang tua siswa MI Nurul Iman dan tidak menemukan data anak saya. Nama anak: … Kelas: …" />
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
                <div className="text-[0.75rem] text-[var(--text-light)]">{data.kelas}{data.nisn ? ` • NISN ${data.nisn}` : ""}</div>
                <div className="mt-1 flex gap-3">
                  <button onClick={() => lihat({ siswaId: data.id })} disabled={busy} className="flex items-center gap-1 min-h-[44px] -ml-1 px-1 text-[0.8rem] font-bold text-[#0d7a8a] bg-transparent border-none cursor-pointer">
                    <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Muat ulang
                  </button>
                </div>
              </div>
            </div>
            {tombolAnakLain}

            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-3">
              <div className="flex items-center mb-3">
                <div className="flex-1 text-[0.82rem] font-bold">Ringkasan</div>
                <select value={bulan} onChange={(e) => setBulan(e.target.value)} className="min-h-[44px] text-[0.85rem] px-2 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)]">
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
                    <div className="text-[0.6rem] font-semibold text-[var(--text-light)]">{s === "T" ? "Telat" : LABEL[s]}</div>
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
            {tombolAnakLain}
          </>
        )}

        <TombolWaAdmin pesan={`Assalamualaikum, saya orang tua${data ? " dari " + data.nama : ""}. Ada yang ingin saya tanyakan soal kehadiran.`} />
        <p className="text-center text-[0.68rem] text-[var(--text-light)] mt-4">Data hanya untuk dilihat dan diperbarui saat guru sinkron. Perubahan kehadiran dilakukan oleh guru.</p>
      </div>
    </div>
  );
}
