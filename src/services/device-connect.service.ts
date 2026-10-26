import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { syncService } from "@/services/sync.service";
import type { Teacher } from "@/types/entities";

/**
 * Setelah email terverifikasi & perangkat terdaftar: jadikan email ini akun cloud perangkat,
 * ambil datanya (atau unggah data HP bila cloud kosong), dan simpan email guru.
 * Mengembalikan pesan hasil untuk toast. Halaman perlu dimuat ulang sesudahnya.
 */
export async function connectDevice(teacher: Teacher, emailAddress: string): Promise<string> {
  localStorage.setItem("presensi_cloud_email", emailAddress);

  let message: string;
  try {
    const downloaded = await syncService.downloadAll(emailAddress);
    if (downloaded > 0) {
      message = `✅ ${downloaded} data dimuat, menyegarkan tampilan…`;
    } else {
      // Cloud masih kosong: data yang sudah ada di HP ini jadi data awal akun.
      const uploaded = await syncService.initialUpload(emailAddress);
      message = uploaded > 0 ? `✅ ${uploaded} data di HP ini disimpan ke cloud` : "⚠️ Terhubung, tapi belum ada data terkirim ke cloud";
    }
  } catch (error) {
    console.error("Download error:", error);
    message = "⚠️ Gagal mengambil data cloud, coba lagi";
  }

  await teacherRepo.update(teacher.id, { ...teacher, email: emailAddress });
  return message;
}
