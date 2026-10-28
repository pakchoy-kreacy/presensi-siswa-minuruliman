import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_LOGO } from "@/lib/constants";
import { toDataUrl } from "@/lib/kartu-pelajar";

export type StatusAbsen = "H" | "S" | "I" | "A" | "T";
export interface AbsensiSiswa {
  nama: string;
  nisn?: string | null;
  kelas: string;
  periode: string;
  riwayat: { tanggal: string; status: StatusAbsen; catatan?: string | null }[];
}

const LABEL: Record<StatusAbsen, string> = { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpha", T: "Terlambat" };
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** PDF kehadiran satu siswa: identitas, ringkasan, lalu daftar per tanggal. */
export async function unduhAbsensiSiswa(a: AbsensiSiswa): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const m = 14;

  const logo = await toDataUrl(DEFAULT_LOGO);
  if (logo) doc.addImage(logo, "PNG", m, 12, 18, 18);
  doc.setFont("helvetica", "bold").setFontSize(13).text("MI NURUL IMAN", w / 2, 20, { align: "center" });
  doc.setFontSize(11).text("LAPORAN KEHADIRAN SISWA", w / 2, 27, { align: "center" });
  doc.setDrawColor(14, 165, 160).setLineWidth(0.5).line(m, 33, w - m, 33);

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Nama     : ${a.nama}`, m, 41);
  doc.text(`NISN     : ${a.nisn || "-"}`, m, 47);
  doc.text(`Kelas    : ${a.kelas}`, m, 53);
  doc.text(`Periode  : ${a.periode}`, m, 59);

  const n = (s: StatusAbsen) => a.riwayat.filter((r) => r.status === s).length;
  const persen = a.riwayat.length ? Math.round(((n("H") + n("T")) / a.riwayat.length) * 100) : 0;
  autoTable(doc, {
    startY: 65,
    head: [["Hadir", "Sakit", "Izin", "Alpha", "Terlambat", "% Hadir"]],
    body: [[n("H"), n("S"), n("I"), n("A"), n("T"), `${persen}%`].map(String)],
    theme: "grid",
    headStyles: { fillColor: [14, 165, 160], textColor: 255, fontStyle: "bold" },
    styles: { halign: "center", fontSize: 10 },
  });

  const urut = [...a.riwayat].sort((x, y) => x.tanggal.localeCompare(y.tanggal));
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Tanggal", "Hari", "Status", "Catatan"]],
    body: urut.length
      ? urut.map((r) => {
          const d = new Date(r.tanggal + "T00:00:00");
          return [`${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`, HARI[d.getDay()], LABEL[r.status], r.catatan && r.catatan !== "mandiri" ? r.catatan : ""];
        })
      : [["Belum ada catatan kehadiran", "", "", ""]],
    theme: "grid",
    headStyles: { fillColor: [14, 165, 160], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`Absensi_${a.nama.replace(/[^\w]+/g, "_")}_${a.periode.replace(/\s+/g, "_")}.pdf`);
}
