import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Download, FileArchive, FileSpreadsheet, FileText, Pencil, X } from "lucide-react";
import { STATUS_COLOR, STATUS_LABEL } from "@/lib/constants";
import { formatTanggalPanjang, todayStr } from "@/lib/utils";
import { muatBukuAbsen, rekapSiswa, type BukuAbsenData } from "@/lib/buku-absen";
import { attendanceService } from "@/services/attendance.service";
import { triggerAutoSync } from "@/hooks/useAutoSync";
import { useToast } from "@/components/shared/Toast";
import { AttendanceStatus } from "@/types/enums";
import type { Classroom, Student, Teacher } from "@/types/entities";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const STATUS = ["H", "S", "I", "A", "T"] as AttendanceStatus[];
const sel = "border border-[var(--border)] text-center text-[0.68rem] p-0 w-[28px] min-w-[28px] h-[32px]";
const tombol = "flex-1 min-h-[44px] flex items-center justify-center gap-[6px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.8rem] cursor-pointer disabled:opacity-50";

/**
 * Rekap presensi kelas: siswa × tanggal, hari libur diblok merah.
 * Unduh rekap kelas (PDF/Excel) atau PDF per siswa; mode "Ubah status" membuat kotak tanggal bisa diketuk.
 */
export function BukuAbsen({ kelas, siswa, start, end, label, teacher, sekolah, highlightId }: {
  kelas: Classroom; siswa: Student[]; start: string; end: string; label: string; teacher: Teacher | null; sekolah: string; highlightId?: number | null;
}) {
  const { toast } = useToast();
  const [data, setData] = useState<BukuAbsenData | null>(null);
  const [edit, setEdit] = useState<{ siswa: Student; tanggal: string } | null>(null);
  const [modeUbah, setModeUbah] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const muat = useCallback(() => { muatBukuAbsen(kelas.id, start, end, teacher).then(setData).catch(() => setData(null)); }, [kelas.id, start, end, teacher]);
  useEffect(() => {
    muat();
    window.addEventListener("data-changed", muat);
    return () => window.removeEventListener("data-changed", muat);
  }, [muat]);

  const info = { sekolah, kelas: kelas.nama, periode: label };
  const unduhPdf = async () => data && (await import("@/lib/buku-absen-pdf")).unduhBukuAbsenPdf(data, siswa, info);
  const unduhExcel = async () => data && (await import("@/lib/buku-absen-pdf")).unduhBukuAbsenExcel(data, siswa, info);
  const absensi = (s: Student) => {
    const st = data!.status.get(s.id);
    const riwayat = data!.tanggal.filter((t) => st?.get(t)).map((t) => ({ tanggal: t, status: st!.get(t)! }));
    return { nama: s.nama, nisn: s.nisn, kelas: kelas.nama, periode: label, riwayat };
  };
  const unduhSiswa = async (s: Student) => {
    if (!data) return;
    (await import("@/lib/absensi-siswa-pdf")).unduhAbsensiSiswa(absensi(s));
  };
  const unduhZip = async () => {
    if (!data || siswa.length === 0) return;
    setSibuk(true);
    try {
      await (await import("@/lib/absensi-siswa-pdf")).unduhZipAbsensi(siswa.map(absensi), `Rekap_Presensi_${kelas.nama}_${label}.zip`);
    } catch {
      toast("❌ Gagal membuat ZIP");
    } finally {
      setSibuk(false);
    }
  };

  const simpan = async (status: AttendanceStatus) => {
    if (!edit) return;
    try {
      const { session } = await attendanceService.bukaSesiPresensi(kelas.id, edit.tanggal, false);
      await attendanceService.ubahStatus(session.id, edit.siswa.id, status);
      setEdit(null);
      triggerAutoSync();
    } catch {
      toast("❌ Gagal mengubah status");
    }
  };

  const hariIni = todayStr();
  const statusEdit = edit ? data?.status.get(edit.siswa.id)?.get(edit.tanggal) : undefined;

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3 min-w-0 max-w-full">
      <div className="text-[0.85rem] font-bold flex items-center gap-[6px] mb-3"><ClipboardList size={16} /> Rekap Presensi — {label}</div>

      <div className="text-[0.7rem] font-semibold text-[var(--text-light)] mb-1">Unduh rekap satu kelas (semua siswa dalam 1 file)</div>
      <div className="flex gap-2 mb-2">
        <button onClick={unduhPdf} disabled={!data} className={tombol}><FileText size={15} /> PDF</button>
        <button onClick={unduhExcel} disabled={!data} className={tombol}><FileSpreadsheet size={15} /> Excel</button>
      </div>
      <div className="text-[0.7rem] font-semibold text-[var(--text-light)] mb-1">Unduh rekap per siswa (1 PDF tiap siswa)</div>
      <button onClick={unduhZip} disabled={!data || sibuk || siswa.length === 0} className={`${tombol} w-full mb-4`}>
        <FileArchive size={15} /> {sibuk ? "Menyiapkan…" : `ZIP berisi ${siswa.length} PDF`}
      </button>

      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setModeUbah(!modeUbah)}
          className={`min-h-[40px] px-3 flex items-center gap-[6px] rounded-[10px] border-[1.5px] font-bold text-[0.78rem] cursor-pointer ${modeUbah ? "border-[#0ea5a0] bg-[#0ea5a0] text-white" : "border-[#0ea5a0] bg-transparent text-[#0d7a8a]"}`}>
          <Pencil size={14} /> {modeUbah ? "Selesai" : "Ubah status"}
        </button>
        <span className="text-[0.7rem] text-[var(--text-light)]">
          {modeUbah ? "Ketuk kotak tanggal yang mau diubah." : "Kolom merah = hari libur. Ikon unduh di nama = PDF siswa itu."}
        </span>
      </div>

      {!data ? (
        <div className="text-[0.75rem] text-[var(--text-light)] py-4 text-center">Memuat…</div>
      ) : siswa.length === 0 ? (
        <div className="text-[0.75rem] text-[var(--text-light)] py-4 text-center">Belum ada siswa di kelas ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-[2] bg-[var(--card-bg)] border border-[var(--border)] text-left text-[0.68rem] px-2 min-w-[120px] max-w-[140px]">Nama</th>
                {data.tanggal.map((t) => {
                  const d = new Date(t + "T00:00:00");
                  const libur = data.libur.has(t);
                  return (
                    <th key={t} title={data.libur.get(t)} className={`${sel} font-semibold leading-tight ${libur ? "bg-[#dc2626] text-white" : "text-[var(--text-light)]"}`}>
                      <div>{d.getDate()}</div><div className="text-[0.52rem] font-normal">{HARI[d.getDay()]}</div>
                    </th>
                  );
                })}
                {STATUS.map((k) => <th key={k} className={`${sel} font-bold`} style={{ color: STATUS_COLOR[k] }}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => {
                const st = data.status.get(s.id);
                const n = rekapSiswa(data, s);
                return (
                  <tr key={s.id} id={`rekap-row-${s.id}`}>
                    <td className={`sticky left-0 z-[1] border border-[var(--border)] p-0 max-w-[140px] ${highlightId === s.id ? "bg-[#fee2e2] dark:bg-[#7f1d1d]" : "bg-[var(--card-bg)]"}`}>
                      <button onClick={() => unduhSiswa(s)} title="Unduh PDF kehadiran siswa ini"
                        className="w-full min-h-[32px] px-2 flex items-center gap-[5px] bg-transparent border-none text-left text-[0.72rem] font-semibold text-[var(--text)] cursor-pointer">
                        <Download size={12} className="text-[#0d7a8a] flex-shrink-0" />
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{s.nama}</span>
                      </button>
                    </td>
                    {data.tanggal.map((t) => {
                      const v = st?.get(t);
                      const libur = data.libur.has(t);
                      if (libur && !v) return <td key={t} className={`${sel} bg-[#fecaca] dark:bg-[#7f1d1d]/50`} />;
                      const bisa = modeUbah && t <= hariIni;
                      return (
                        <td key={t} className={`${sel} ${libur ? "bg-[#fecaca] dark:bg-[#7f1d1d]/50" : bisa ? "bg-[#0ea5a0]/[0.07]" : ""}`}>
                          <button disabled={!bisa} onClick={() => setEdit({ siswa: s, tanggal: t })}
                            className="w-full h-full bg-transparent border-none p-0 font-bold cursor-pointer disabled:cursor-default"
                            style={v ? { color: STATUS_COLOR[v] } : undefined}>
                            {v || <span className="text-[var(--text-light)] font-normal">·</span>}
                          </button>
                        </td>
                      );
                    })}
                    {STATUS.map((k) => <td key={k} className={`${sel} font-bold bg-[var(--input-bg)]`}>{n[k]}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[500] bg-black/50 flex items-end lg:items-center justify-center" onClick={() => setEdit(null)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[440px] px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1">
                <div className="text-[0.95rem] font-bold text-[var(--text)]">{edit.siswa.nama}</div>
                <div className="text-[0.75rem] text-[var(--text-light)]">{formatTanggalPanjang(edit.tanggal)} · tersimpan otomatis</div>
              </div>
              <button onClick={() => setEdit(null)} aria-label="Tutup" className="w-11 h-11 flex items-center justify-center bg-transparent border-none text-[var(--text-light)] cursor-pointer"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STATUS.map((st) => (
                <button key={st} onClick={() => simpan(st)}
                  className="min-h-[52px] rounded-xl text-[0.78rem] font-bold cursor-pointer border-[1.5px]"
                  style={statusEdit === st ? { background: STATUS_COLOR[st], borderColor: STATUS_COLOR[st], color: "#fff" } : { background: "transparent", borderColor: STATUS_COLOR[st], color: STATUS_COLOR[st] }}>
                  {st === "T" ? "Telat" : STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
