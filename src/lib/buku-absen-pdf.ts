import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { simpanFile } from "@/lib/simpan-file";
import { perBulan, rekapSiswa, type BukuAbsenData } from "@/lib/buku-absen";
import type { Student } from "@/types/entities";

const MERAH: [number, number, number] = [254, 202, 202];
const WARNA: Record<string, [number, number, number]> = { H: [22, 163, 74], S: [234, 88, 12], I: [37, 99, 235], A: [220, 38, 38], T: [217, 119, 6] };
type Info = { sekolah: string; kelas: string; periode: string };
const namaFile = (o: Info, ext: string) => `Buku_Absen_${o.kelas}_${o.periode}.${ext}`.replace(/[^\w.-]+/g, "_");

/** Buku absen A4 mendatar: satu halaman per bulan, siswa × tanggal, kolom libur diblok merah. */
export function unduhBukuAbsenPdf(data: BukuAbsenData, siswa: Student[], o: Info) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  perBulan(data.tanggal).forEach((b, bi) => {
    if (bi > 0) doc.addPage();
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(15, 23, 42).text(`BUKU ABSEN — ${o.sekolah.toUpperCase()}`, w / 2, 12, { align: "center" });
    doc.setFont("helvetica", "normal").setFontSize(9).text(`Kelas: ${o.kelas}    Bulan: ${b.label}`, w / 2, 18, { align: "center" });
    const kolomLibur = new Set(b.tanggal.map((t, i) => (data.libur.has(t) ? i + 2 : -1)));
    autoTable(doc, {
      startY: 22,
      head: [["No", "Nama", ...b.tanggal.map((t) => String(Number(t.slice(8)))), "H", "S", "I", "A", "T"]],
      body: siswa.map((s, i) => {
        const n = rekapSiswa(data, s, b.tanggal);
        return [String(i + 1), s.nama, ...b.tanggal.map((t) => (data.libur.has(t) ? "" : data.status.get(s.id)?.get(t) || "")), n.H, n.S, n.I, n.A, n.T].map(String);
      }),
      theme: "grid",
      styles: { fontSize: 6.5, cellPadding: 0.8, halign: "center", lineColor: [203, 213, 225], lineWidth: 0.1 },
      headStyles: { fillColor: [14, 165, 160], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 7 }, 1: { halign: "left", cellWidth: 42 } },
      margin: { left: 8, right: 8 },
      didParseCell: (c) => {
        if (kolomLibur.has(c.column.index)) c.cell.styles.fillColor = c.section === "head" ? [220, 38, 38] : MERAH;
        else if (c.section === "body" && c.column.index > 1 && c.column.index < b.tanggal.length + 2 && WARNA[c.cell.raw as string]) {
          c.cell.styles.textColor = WARNA[c.cell.raw as string];
          c.cell.styles.fontStyle = "bold";
        }
      },
    });
    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(7.5).setTextColor(71, 85, 105);
    doc.text("Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alpha, T = Terlambat. Kolom merah = hari libur.", 8, y);
  });
  simpanFile(doc.output("blob"), namaFile(o, "pdf"));
}

/** Buku absen Excel: satu sheet per bulan, libur ditandai "L". */
export async function unduhBukuAbsenExcel(data: BukuAbsenData, siswa: Student[], o: Info) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const b of perBulan(data.tanggal)) {
    const ws = XLSX.utils.aoa_to_sheet([
      [`BUKU ABSEN — ${o.sekolah.toUpperCase()}`],
      [`Kelas: ${o.kelas}`, "", `Bulan: ${b.label}`],
      ["No", "Nama", ...b.tanggal.map((t) => Number(t.slice(8))), "H", "S", "I", "A", "T"],
      ...siswa.map((s, i) => {
        const n = rekapSiswa(data, s, b.tanggal);
        return [i + 1, s.nama, ...b.tanggal.map((t) => (data.libur.has(t) ? "L" : data.status.get(s.id)?.get(t) || "")), n.H, n.S, n.I, n.A, n.T];
      }),
      [],
      ["Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alpha, T = Terlambat, L = Libur."],
    ]);
    ws["!cols"] = [{ wch: 4 }, { wch: 28 }, ...b.tanggal.map(() => ({ wch: 3.5 })), ...Array(5).fill({ wch: 4 })];
    XLSX.utils.book_append_sheet(wb, ws, b.label.slice(0, 31));
  }
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  simpanFile(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), namaFile(o, "xlsx"));
}
