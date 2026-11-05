import { useCallback, useEffect, useState } from "react";
import { BookOpen, FileText } from "lucide-react";
import { STATUS_COLOR } from "@/lib/constants";
import { muatBukuAbsen, rekapSiswa, type BukuAbsenData } from "@/lib/buku-absen";
import type { Classroom, Student, Teacher } from "@/types/entities";

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const sel = "border border-[var(--border)] text-center text-[0.68rem] p-0 w-[26px] min-w-[26px] h-[30px]";

/** Rekap gaya buku absen: siswa × tanggal, hari libur diblok merah. */
export function BukuAbsen({ kelas, siswa, start, end, label, teacher, sekolah }: {
  kelas: Classroom; siswa: Student[]; start: string; end: string; label: string; teacher: Teacher | null; sekolah: string;
}) {
  const [data, setData] = useState<BukuAbsenData | null>(null);
  const muat = useCallback(() => { muatBukuAbsen(kelas.id, start, end, teacher).then(setData).catch(() => setData(null)); }, [kelas.id, start, end, teacher]);
  useEffect(() => {
    muat();
    window.addEventListener("data-changed", muat);
    return () => window.removeEventListener("data-changed", muat);
  }, [muat]);

  const unduh = async () => {
    if (!data) return;
    const { unduhBukuAbsenPdf } = await import("@/lib/buku-absen-pdf");
    unduhBukuAbsenPdf(data, siswa, { sekolah, kelas: kelas.nama, periode: label });
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
      <div className="text-[0.8rem] font-bold flex items-center gap-[6px] mb-1"><BookOpen size={15} /> Buku Absen — {label}</div>
      <p className="text-[0.7rem] text-[var(--text-light)] mb-2">Geser ke samping untuk melihat semua tanggal. Kolom merah = hari libur.</p>
      {!data ? (
        <div className="text-[0.75rem] text-[var(--text-light)] py-4 text-center">Memuat…</div>
      ) : (
        <div className="overflow-x-auto -mx-[14px] px-[14px]">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-[1] bg-[var(--card-bg)] border border-[var(--border)] text-left text-[0.68rem] px-2 min-w-[110px]">Nama</th>
                {data.tanggal.map((t) => {
                  const d = new Date(t + "T00:00:00");
                  const libur = data.libur.has(t);
                  return (
                    <th key={t} title={data.libur.get(t)} className={`${sel} font-semibold leading-tight ${libur ? "bg-[#dc2626] text-white" : "text-[var(--text-light)]"}`}>
                      <div>{d.getDate()}</div><div className="text-[0.52rem] font-normal">{HARI[d.getDay()]}</div>
                    </th>
                  );
                })}
                {(["H", "S", "I", "A", "T"] as const).map((k) => (
                  <th key={k} className={`${sel} font-bold`} style={{ color: STATUS_COLOR[k] }}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => {
                const st = data.status.get(s.id);
                const n = rekapSiswa(data, s);
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-[1] bg-[var(--card-bg)] border border-[var(--border)] text-[0.72rem] font-semibold px-2 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis">{s.nama}</td>
                    {data.tanggal.map((t) => {
                      const v = st?.get(t);
                      return data.libur.has(t)
                        ? <td key={t} className={`${sel} bg-[#fecaca] dark:bg-[#7f1d1d]/50`} />
                        : <td key={t} className={`${sel} font-bold`} style={v ? { color: STATUS_COLOR[v] } : undefined}>{v || <span className="text-[var(--text-light)] font-normal">·</span>}</td>;
                    })}
                    {(["H", "S", "I", "A", "T"] as const).map((k) => <td key={k} className={`${sel} font-bold bg-[var(--input-bg)]`}>{n[k]}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={unduh} disabled={!data}
        className="w-full min-h-[44px] mt-3 flex items-center justify-center gap-[6px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] cursor-pointer disabled:opacity-50">
        <FileText size={15} /> Buku Absen PDF
      </button>
    </div>
  );
}
