import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { simpanFile } from "@/lib/simpan-file";
import { rekapSiswa, type BukuAbsenData } from "@/lib/buku-absen";
import type { Student } from "@/types/entities";

const MERAH: [number, number, number] = [254, 202, 202];
const WARNA: Record<string, [number, number, number]> = { H: [22, 163, 74], S: [234, 88, 12], I: [37, 99, 235], A: [220, 38, 38], T: [217, 119, 6] };

/** Buku absen A4 mendatar: siswa × tanggal, kolom libur diblok merah. */
export function unduhBukuAbsenPdf(data: BukuAbsenData, siswa: Student[], o: { sekolah: string; kelas: string; periode: string }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold").setFontSize(12).text(`BUKU ABSEN — ${o.sekolah.toUpperCase()}`, w / 2, 12, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(9).text(`Kelas: ${o.kelas}    Bulan: ${o.periode}`, w / 2, 18, { align: "center" });

  const hari = data.tanggal.map((t) => String(Number(t.slice(8))));
  const body = siswa.map((s, i) => {
    const st = data.status.get(s.id);
    const n = rekapSiswa(data, s);
    return [String(i + 1), s.nama, ...data.tanggal.map((t) => (data.libur.has(t) ? "" : st?.get(t) || "")), n.H, n.S, n.I, n.A, n.T].map(String);
  });
  const kolomLibur = new Set(data.tanggal.map((t, i) => (data.libur.has(t) ? i + 2 : -1)));

  autoTable(doc, {
    startY: 22,
    head: [["No", "Nama", ...hari, "H", "S", "I", "A", "T"]],
    body,
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 0.8, halign: "center", lineColor: [203, 213, 225], lineWidth: 0.1 },
    headStyles: { fillColor: [14, 165, 160], textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 7 }, 1: { halign: "left", cellWidth: 42 } },
    margin: { left: 8, right: 8 },
    didParseCell: (c) => {
      if (kolomLibur.has(c.column.index)) {
        c.cell.styles.fillColor = c.section === "head" ? [220, 38, 38] : MERAH;
      } else if (c.section === "body" && WARNA[c.cell.raw as string] && c.column.index > 1 && c.column.index < data.tanggal.length + 2) {
        c.cell.styles.textColor = WARNA[c.cell.raw as string];
        c.cell.styles.fontStyle = "bold";
      }
    },
  });

  const y = (doc as any).lastAutoTable.finalY + 6;
  doc.setFontSize(7.5).setTextColor(71, 85, 105);
  doc.text("Keterangan: H = Hadir, S = Sakit, I = Izin, A = Alpha, T = Terlambat. Kolom merah = hari libur.", 8, y);
  simpanFile(doc.output("blob"), `Buku_Absen_${o.kelas}_${o.periode}.pdf`.replace(/\s+/g, "_"));
}
