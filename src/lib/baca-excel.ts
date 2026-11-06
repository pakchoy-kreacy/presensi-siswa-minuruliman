// Pembaca nilai sel Excel untuk import siswa (tanpa dependensi, supaya mudah dites).

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
export function bacaNisn(v: unknown): string | undefined {
  const t = typeof v === "number" ? String(Math.round(v)) : String(v ?? "").replace(/\D/g, "");
  if (!t) return undefined;
  return t.length < 10 && typeof v === "number" ? t.padStart(10, "0") : t;
}

