import { db } from "@/repositories/dexie/db";
import { attendanceRepo } from "@/repositories/dexie/attendance.repo";
import { CalendarEntryType, AttendanceStatus } from "@/types/enums";
import { isDayActive } from "@/lib/utils";
import type { Student, Teacher } from "@/types/entities";

export interface BukuAbsenData {
  tanggal: string[];
  /** Tanggal libur (hari tidak aktif atau "Hari Libur" di Kalender) → keterangan. */
  libur: Map<string, string>;
  /** siswaId → tanggal → status */
  status: Map<number, Map<string, AttendanceStatus>>;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Data buku absen satu kelas untuk rentang tanggal (biasanya satu bulan). */
export async function muatBukuAbsen(kelasId: number, start: string, end: string, teacher?: Teacher | null): Promise<BukuAbsenData> {
  const tanggal: string[] = [];
  for (let d = new Date(start + "T00:00:00"); ; d.setDate(d.getDate() + 1)) {
    const t = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (t > end) break;
    tanggal.push(t);
  }

  const libur = new Map<string, string>();
  for (const t of tanggal) {
    if (!isDayActive(new Date(t + "T00:00:00").getDay(), teacher ?? undefined)) libur.set(t, "Libur");
  }
  const kalender = await db.calendarEntries.where("tanggal").between(start, end, true, true)
    .filter((e) => e.jenis === CalendarEntryType.HARI_LIBUR).toArray();
  for (const e of kalender) libur.set(e.tanggal, e.keterangan || "Hari Libur");

  const status = new Map<number, Map<string, AttendanceStatus>>();
  for (const se of await attendanceRepo.getSessionsInRange(kelasId, start, end)) {
    for (const r of await attendanceRepo.getRecords(se.id)) {
      if (!status.has(r.siswaId)) status.set(r.siswaId, new Map());
      status.get(r.siswaId)!.set(se.tanggal, r.status);
    }
  }
  return { tanggal, libur, status };
}

export const rekapSiswa = (data: BukuAbsenData, s: Student) => {
  const n = { H: 0, S: 0, I: 0, A: 0, T: 0 } as Record<AttendanceStatus, number>;
  for (const st of data.status.get(s.id)?.values() || []) n[st]++;
  return n;
};
