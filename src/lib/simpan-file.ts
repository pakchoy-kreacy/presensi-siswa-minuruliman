/**
 * Unduh file dari memori. Link ditempel ke halaman dan URL baru dilepas setelah 60 detik:
 * di Chrome Android unduhan berjalan belakangan, jadi URL yang langsung dilepas menghasilkan file gagal.
 */
export function simpanFile(isi: Blob, namaFile: string): void {
  const url = URL.createObjectURL(isi);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
