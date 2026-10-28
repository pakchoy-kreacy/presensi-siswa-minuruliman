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
  logoUrl: string;
  baseUrl?: string;
}

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

function depan(doc: jsPDF, s: Student, x: number, y: number, logo: string | null, qr: string, o: KartuOptions) {
  doc.setDrawColor(200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, "FD");

  // Kepala kartu
  doc.setFillColor(...HIJAU);
  doc.roundedRect(x, y, CARD_W, 13, 3, 3, "F");
  doc.rect(x, y + 9, CARD_W, 4, "F");
  if (logo) doc.addImage(logo, "PNG", x + 3, y + 1.8, 9.4, 9.4);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("KARTU PELAJAR", x + 14.5, y + 6.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.3);
  doc.text(o.namaMadrasah.toUpperCase(), x + 14.5, y + 10);
  doc.setFillColor(...KUNING);
  doc.rect(x, y + 13, CARD_W, 0.9, "F");

  // Foto 3×4
  const fx = x + 4, fy = y + 17, fw = 19, fh = 25.3;
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

  // Data siswa
  const dx = x + 26.5;
  const lebar = 36;
  doc.setTextColor(30, 41, 59);
  const baris = (label: string, nilai: string, yy: number, tebal = false) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.4);
    doc.setTextColor(100, 116, 139);
    doc.text(label, dx, yy);
    doc.setFont("helvetica", tebal ? "bold" : "normal");
    doc.setFontSize(tebal ? 7.6 : 6.6);
    doc.setTextColor(15, 23, 42);
    const isi = doc.splitTextToSize(nilai, lebar).slice(0, 2);
    doc.text(isi, dx, yy + 2.9);
    return yy + 2.9 + (isi.length - 1) * 2.8 + 3.6;
  };
  let yy = y + 18.3;
  yy = baris("Nama", s.nama.toUpperCase(), yy, true);
  yy = baris("NISN", s.nisn || "-", yy);
  yy = baris("Tempat, Tanggal Lahir", ttl(s), yy);
  baris("Madrasah", o.namaMadrasah, yy);

  // QR (bisa dipindai di Mode QR presensi)
  doc.addImage(qr, "PNG", x + CARD_W - 19.5, y + CARD_H - 21.5, 16.5, 16.5);

  doc.setFillColor(...HIJAU);
  doc.rect(x, y + CARD_H - 3, CARD_W, 1.4, "F");
}

function belakang(doc: jsPDF, x: number, y: number, logo: string | null, o: KartuOptions) {
  doc.setFillColor(...HIJAU);
  doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, "F");
  doc.setFillColor(...KUNING);
  doc.rect(x, y + CARD_H - 5, CARD_W, 1, "F");
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.circle(x + CARD_W / 2, y + 17, 12.5, "F");
    doc.addImage(logo, "PNG", x + CARD_W / 2 - 12, y + 5, 24, 24);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("KARTU PELAJAR", x + CARD_W / 2, y + 36.5, { align: "center" });
  doc.setFontSize(8.5);
  doc.text("MADRASAH NURUL IMAN", x + CARD_W / 2, y + 41.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.text(o.alamat, x + CARD_W / 2, y + 45.8, { align: "center" });
}

export async function generateKartuPelajarPdf(students: Student[], o: KartuOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await toDataUrl(o.logoUrl);
  const perHalaman = COLS * ROWS;
  const qrs = await Promise.all(students.map((s) => QRCode.toDataURL(qrIsi(s, o.baseUrl), { margin: 0, width: 240 })));

  for (let start = 0; start < students.length; start += perHalaman) {
    if (start > 0) doc.addPage();
    const kelompok = students.slice(start, start + perHalaman);
    kelompok.forEach((s, i) => {
      const { x, y } = posisi(i, false);
      depan(doc, s, x, y, logo, qrs[start + i], o);
    });
    doc.addPage();
    kelompok.forEach((_, i) => {
      const { x, y } = posisi(i, true);
      belakang(doc, x, y, logo, o);
    });
  }
  return doc;
}
