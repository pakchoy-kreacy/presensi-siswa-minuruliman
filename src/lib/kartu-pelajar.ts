import QRCode from "qrcode";
import jsPDF from "jspdf";
import type { Student } from "@/types/entities";

// Kartu ukuran KTP (ID-1), 10 kartu per A4. Halaman depan lalu belakang (posisi dicerminkan untuk cetak bolak-balik).
const CARD_W = 85.6;
const CARD_H = 54;
const COLS = 2;
const ROWS = 5;
const GAP_X = 8;
const GAP_Y = 3;
const MARGIN_X = (210 - COLS * CARD_W - (COLS - 1) * GAP_X) / 2;
const MARGIN_Y = (297 - ROWS * CARD_H - (ROWS - 1) * GAP_Y) / 2;
const HIJAU: [number, number, number] = [22, 128, 61];
const KUNING: [number, number, number] = [250, 204, 21];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export interface KartuOptions {
  namaMadrasah: string;
  alamat: string;
  /** Baris kop seperti kop surat madrasah. */
  yayasan?: string;
  nsmNpsn?: string;
  hp?: string;
  logoUrl: string;
  baseUrl?: string;
  /** Kepala madrasah: nama, gambar tanda tangan dan stempel (PNG transparan). */
  kepala?: { nama: string; ttdUrl?: string; stempelUrl?: string };
}

const VISI = "Menjadi pusat pengembangan keilmuan dan membentuk generasi yang berilmu, beriman, beramal sholeh serta santun dalam bercakap";
const MISI = "Membina akhlak dan budi pekerti serta pembiasaan al-Qur'an dalam kehidupan sehari-hari";

export async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const ttl = (s: Student) => {
  const tgl = s.tanggalLahir?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tanggal = tgl ? `${Number(tgl[3])} ${BULAN[Number(tgl[2]) - 1]} ${tgl[1]}` : "";
  return [s.tempatLahir, tanggal].filter(Boolean).join(", ") || "-";
};

const qrIsi = (s: Student, baseUrl?: string) => (baseUrl && s.absenToken ? `${baseUrl}/s/${s.absenToken}` : `PRESENSI:${s.id}`);

function posisi(i: number, cermin: boolean) {
  const slot = i % (COLS * ROWS);
  let col = slot % COLS;
  if (cermin) col = COLS - 1 - col;
  const row = Math.floor(slot / COLS);
  return { x: MARGIN_X + col * (CARD_W + GAP_X), y: MARGIN_Y + row * (CARD_H + GAP_Y) };
}

function depan(doc: jsPDF, s: Student, x: number, y: number, logo: string | null, ttd: string | null, stempel: string | null, qr: string, o: KartuOptions) {
  doc.setDrawColor(200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, "FD");

  // Kop seperti kop surat: logo di kiri; yayasan, nama madrasah, NSM/NPSN, alamat rata tengah
  const KOP = 17;
  doc.setFillColor(...HIJAU);
  doc.roundedRect(x, y, CARD_W, KOP, 3, 3, "F");
  doc.rect(x, y + KOP - 4, CARD_W, 4, "F");
  if (logo) doc.addImage(logo, "PNG", x + 2.5, y + 2.5, 12, 12);
  const tengah = x + 15 + (CARD_W - 16.5) / 2;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  if (o.yayasan) doc.setFontSize(5.6).text(o.yayasan.toUpperCase(), tengah, y + 3.8, { align: "center" });
  doc.setFontSize(9.5).text(o.namaMadrasah.toUpperCase(), tengah, y + 7.9, { align: "center" });
  if (o.nsmNpsn) doc.setFontSize(5.4).text(o.nsmNpsn, tengah, y + 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6).text(o.hp ? `${o.alamat} · HP ${o.hp}` : o.alamat, tengah, y + 14.4, { align: "center" });
  doc.setFillColor(...KUNING);
  doc.rect(x, y + KOP, CARD_W, 0.9, "F");

  // Label "KARTU PELAJAR" tepat di atas QR
  doc.setFillColor(...HIJAU);
  doc.roundedRect(x + CARD_W - 21, y + CARD_H - 26.6, 19, 3.8, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4).text("KARTU PELAJAR", x + CARD_W - 11.5, y + CARD_H - 24, { align: "center" });

  // Foto 3×4
  const fx = x + 4, fy = y + KOP + 3.5, fw = 19, fh = 25.3;
  if (s.foto) {
    doc.addImage(s.foto, "JPEG", fx, fy, fw, fh);
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(fx, fy, fw, fh, "F");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(6);
    doc.text("FOTO 3×4", fx + fw / 2, fy + fh / 2, { align: "center" });
  }
  doc.setDrawColor(...HIJAU);
  doc.rect(fx, fy, fw, fh);

  // Data siswa: "label : isi" per baris
  const dx = x + 26.5;
  const dv = dx + 16;
  const baris = (label: string, nilai: string, yy: number, tebal = false, lebar = x + CARD_W - 23.5 - dv) => {
    doc.setFont("helvetica", "normal").setFontSize(5.2).setTextColor(100, 116, 139);
    doc.text(label, dx, yy);
    doc.text(":", dv - 1.4, yy);
    doc.setFont("helvetica", tebal ? "bold" : "normal").setFontSize(tebal ? 7 : 6.2).setTextColor(15, 23, 42);
    const isi = doc.splitTextToSize(nilai, lebar).slice(0, 2);
    doc.text(isi, dv, yy, { lineHeightFactor: 1.15 });
    return yy + isi.length * 2.9 + 0.9;
  };
  let yy = y + KOP + 5;
  // Nama boleh selebar kartu: barisnya di atas label "KARTU PELAJAR" dan QR
  yy = baris("Nama", s.nama.toUpperCase(), yy, true, x + CARD_W - 4 - dv);
  yy = baris("NISN", s.nisn || "-", yy);
  baris("Tempat, Tgl Lahir", ttl(s), yy);

  // Tanda tangan Kepala Madrasah, stempel menumpuk di kiri (seperti cap basah)
  if (o.kepala) {
    const tx = x + 33, ty = y + CARD_H - 15;
    doc.setFont("helvetica", "normal").setFontSize(5.2).setTextColor(51, 65, 85);
    doc.text("Kepala Madrasah", tx + 12, ty, { align: "center" });
    if (ttd) doc.addImage(ttd, "PNG", tx + 5, ty + 0.4, 15, 8.1);
    if (stempel) {
      const GState = (doc as any).GState;
      doc.setGState(new GState({ opacity: 0.85 }));
      doc.addImage(stempel, "PNG", tx - 7, ty - 2.2, 11.5, 11.5);
      doc.setGState(new GState({ opacity: 1 }));
    }
    doc.setFont("helvetica", "bold").setFontSize(5.8).setTextColor(15, 23, 42);
    doc.text(o.kepala.nama, tx + 12, ty + 10.6, { align: "center" });
    const w = doc.getTextWidth(o.kepala.nama);
    doc.setDrawColor(15, 23, 42).setLineWidth(0.15).line(tx + 12 - w / 2, ty + 11.1, tx + 12 + w / 2, ty + 11.1);
  }

  // QR (bisa dipindai di Mode QR presensi)
  doc.addImage(qr, "PNG", x + CARD_W - 19.5, y + CARD_H - 21.5, 16.5, 16.5);

  doc.setFillColor(...HIJAU);
  doc.rect(x, y + CARD_H - 3, CARD_W, 1.4, "F");
}

// Blok "VISI"/"MISI": judul lalu paragraf rata kiri. Mengembalikan posisi y berikutnya.
function blokTeks(doc: jsPDF, judul: string, isi: string, x: number, y: number, lebar: number, warnaJudul: number[], warnaIsi: number[]) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.setTextColor(warnaJudul[0], warnaJudul[1], warnaJudul[2]);
  doc.text(judul, x, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(warnaIsi[0], warnaIsi[1], warnaIsi[2]);
  const baris = doc.splitTextToSize(isi, lebar);
  doc.text(baris, x, y + 3.8, { lineHeightFactor: 1.3 });
  return y + 3.8 + baris.length * 3.3 + 2.6;
}

// Sisi belakang: hijau penuh, judul kuning, isi putih.
function belakang(doc: jsPDF, x: number, y: number, logo: string | null, o: KartuOptions) {
  doc.setFillColor(...HIJAU);
  doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, "F");
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.circle(x + 9.5, y + 8.5, 5.6, "F");
    doc.addImage(logo, "PNG", x + 4.3, y + 3.3, 10.4, 10.4);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(o.namaMadrasah.toUpperCase(), x + 17.5, y + 7.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text(o.alamat, x + 17.5, y + 11);
  doc.setFillColor(...KUNING);
  doc.rect(x + 4, y + 15.5, CARD_W - 8, 0.5, "F");
  let yy = blokTeks(doc, "VISI", VISI, x + 5, y + 21, CARD_W - 10, KUNING, [255, 255, 255]);
  blokTeks(doc, "MISI", MISI, x + 5, yy, CARD_W - 10, KUNING, [255, 255, 255]);
  doc.setFillColor(...KUNING);
  doc.rect(x, y + CARD_H - 4, CARD_W, 1, "F");
}

export async function generateKartuPelajarPdf(students: Student[], o: KartuOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const [logo, ttd, stempel] = await Promise.all([
    toDataUrl(o.logoUrl),
    o.kepala?.ttdUrl ? toDataUrl(o.kepala.ttdUrl) : null,
    o.kepala?.stempelUrl ? toDataUrl(o.kepala.stempelUrl) : null,
  ]);
  const perHalaman = COLS * ROWS;
  const qrs = await Promise.all(students.map((s) => QRCode.toDataURL(qrIsi(s, o.baseUrl), { margin: 0, width: 240 })));

  for (let start = 0; start < students.length; start += perHalaman) {
    if (start > 0) doc.addPage();
    const kelompok = students.slice(start, start + perHalaman);
    kelompok.forEach((s, i) => {
      const { x, y } = posisi(i, false);
      depan(doc, s, x, y, logo, ttd, stempel, qrs[start + i], o);
    });
    doc.addPage();
    kelompok.forEach((_, i) => {
      const { x, y } = posisi(i, true);
      belakang(doc, x, y, logo, o);
    });
  }
  return doc;
}
