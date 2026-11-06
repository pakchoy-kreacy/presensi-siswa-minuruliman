import type { Student } from "@/types/entities";
import { timestamp, generateId } from "@/lib/utils";
import { simpanFile } from "@/lib/simpan-file";

export interface ImportResult {
  success: boolean;
  students: { nama: string; nisn?: string; jenisKelamin?: "L" | "P"; kelas?: string; tempatLahir?: string; tanggalLahir?: string }[];
  errors: string[];
  classes: string[];
}

const BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Tanggal dari Excel (tanggal asli, angka seri, "12/05/2018", "2018-05-12", "12 Mei 2018") → "YYYY-MM-DD". */
export function bacaTanggal(v: unknown): string | undefined {
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number" && v > 1000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const t = String(v ?? "").trim().toLowerCase();
  if (!t) return undefined;
  let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = t.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  const b = m ? BULAN.findIndex((x) => x.startsWith(m![2].slice(0, 3))) : -1;
  if (m && b >= 0) return `${m[3]}-${pad(b + 1)}-${pad(+m[1])}`;
  return undefined;
}

/** NISN: angka saja; NISN 10 digit yang tersimpan sebagai angka di Excel kehilangan nol di depan. */
function bacaNisn(v: unknown): string | undefined {
  const t = typeof v === "number" ? String(Math.round(v)) : String(v ?? "").replace(/\D/g, "");
  if (!t) return undefined;
  return t.length < 10 && typeof v === "number" ? t.padStart(10, "0") : t;
}

const kunci = (k: string) => k.toLowerCase().replace(/[^a-z/]+/g, " ").trim();
const KOLOM = {
  nama: ["nama", "nama siswa", "nama lengkap", "nama peserta didik", "name"],
  kelas: ["kelas", "class", "kode kelas", "rombel"],
  nisn: ["nisn", "nis", "no induk"],
  jk: ["jenis kelamin", "jk", "gender", "l/p"],
  tempat: ["tempat lahir", "tempat"],
  tanggal: ["tanggal lahir", "tgl lahir", "tgl. lahir", "tanggal"],
  ttl: ["ttl", "tempat tanggal lahir", "tempat tgl lahir", "tempat dan tanggal lahir"],
};

export async function parseExcel(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx"); // dimuat saat dipakai saja
  try {
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { success: false, students: [], errors: ["File Excel kosong"], classes: [] };
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });

    // Baris judul = baris pertama yang punya kolom "Nama" (baris petunjuk di atasnya dilewati).
    const hi = grid.findIndex((r) => r.some((c) => KOLOM.nama.includes(kunci(String(c)))));
    if (hi < 0) return { success: false, students: [], errors: ['Kolom "Nama" tidak ditemukan. Pakai template dari tombol Template.'], classes: [] };
    const judul = grid[hi].map((c) => kunci(String(c)));
    const kol = (nama: string[]) => judul.findIndex((j) => nama.includes(j));
    const k = Object.fromEntries(Object.entries(KOLOM).map(([n, v]) => [n, kol(v.map(kunci))])) as Record<keyof typeof KOLOM, number>;

    const errors: string[] = [];
    const students: ImportResult["students"] = [];
    grid.slice(hi + 1).forEach((r, i) => {
      const ambil = (c: number) => (c >= 0 ? r[c] : "");
      const nama = String(ambil(k.nama)).trim();
      if (!nama) {
        if (r.some((c) => String(c).trim())) errors.push(`Baris ${hi + i + 2} tidak memiliki nama siswa`);
        return;
      }
      const jk = String(ambil(k.jk)).trim().toUpperCase();
      let tempatLahir = String(ambil(k.tempat)).trim() || undefined;
      let tanggalLahir = bacaTanggal(ambil(k.tanggal));
      if (k.ttl >= 0 && (!tempatLahir || !tanggalLahir)) {
        // "Sangatta, 12 Mei 2018"
        const [tp, ...tg] = String(ambil(k.ttl)).split(",");
        tempatLahir ||= tp.trim() || undefined;
        tanggalLahir ||= bacaTanggal(tg.join(",").trim());
      }
      const kelas = String(ambil(k.kelas)).trim() || undefined;
      if (!kelas) errors.push(`⚠️ Peringatan baris ${hi + i + 2}: Siswa "${nama}" tidak memiliki kelas (akan masuk ke kelas saat ini)`);
      students.push({
        nama,
        nisn: bacaNisn(ambil(k.nisn)),
        jenisKelamin: ["L", "LAKI-LAKI", "M", "MALE"].includes(jk) ? "L" : ["P", "PEREMPUAN", "F", "FEMALE"].includes(jk) ? "P" : undefined,
        kelas,
        tempatLahir,
        tanggalLahir,
      });
    });
    if (students.length === 0) return { success: false, students: [], errors: ["File Excel tidak memiliki data siswa", ...errors], classes: [] };
    const classes = [...new Set(students.map((s) => s.kelas).filter(Boolean) as string[])];
    return { success: errors.length === 0, students, errors, classes };
  } catch {
    return { success: false, students: [], errors: ["File tidak dapat dibaca. Pastikan file Excel (.xlsx) valid."], classes: [] };
  }
}

export async function generateTemplateBlob(): Promise<Blob> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Petunjuk: Nama dan Kelas WAJIB diisi. Lainnya boleh kosong. Tanggal lahir ditulis 12/05/2018. Siswa yang sudah ada (nama sama) akan diperbarui."],
    ["Nama", "Kelas", "Jenis Kelamin", "NISN", "Tempat Lahir", "Tanggal Lahir"],
    ["Ahmad Fauzi", "Kelas 1", "L", "0123456789", "Sangatta", "12/05/2018"],
    ["Bunga Citra", "Kelas 1", "P", "", "Bontang", "03/11/2018"],
  ]);
  // NISN & tanggal sebagai teks, supaya nol di depan NISN tidak hilang
  for (let r = 2; r <= 200; r++) for (const c of ["D", "F"]) ws[`${c}${r}`] ??= { t: "s", v: "" }, (ws[`${c}${r}`].z = "@");
  ws["!ref"] = "A1:F200";
  ws["!cols"] = [{ wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Siswa");
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export async function downloadTemplate() {
  const blob = await generateTemplateBlob();
  simpanFile(blob, "template_daftar_siswa.xlsx");
}

export function siswaToImportResult(
  result: ImportResult,
  defaultKelasId: number,
  classrooms?: Array<{ id: number; nama: string }>
): Student[] {
  const now = timestamp();
  return result.students.map((s, i) => {
    // Try to find matching classroom by name
    let kelasId = defaultKelasId;
    
    if (s.kelas && classrooms) {
      const matchedClass = classrooms.find(
        c => c.nama.toLowerCase().trim() === s.kelas!.toLowerCase().trim()
      );
      if (matchedClass) {
        kelasId = matchedClass.id;
      }
    }
    
    return {
      id: generateId() + i,
      kelasId,
      nama: s.nama,
      nisn: s.nisn || undefined,
      jenisKelamin: s.jenisKelamin,
      tempatLahir: s.tempatLahir,
      tanggalLahir: s.tanggalLahir,
      urutan: i + 1,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    };
  });
}
