import { Tier } from "@/types/enums";

// Aplikasi ini dipakai satu sekolah: semua fitur terbuka, tanpa paket dan tanpa batas kelas/siswa.
export const LIMITS: Record<Tier, { kelas: number; siswaPerKelas: number }> = {
  [Tier.FREE]: { kelas: Infinity, siswaPerKelas: Infinity },
  [Tier.PLUS]: { kelas: Infinity, siswaPerKelas: Infinity },
  [Tier.PRO]: { kelas: Infinity, siswaPerKelas: Infinity },
};

export function canUse(_feature: string, _tier?: Tier | null): boolean {
  return true;
}

export function limitsFor(_tier?: Tier | null) {
  return LIMITS[Tier.PRO];
}

export function isQrActive(_tier?: Tier | null): boolean {
  try {
    return localStorage.getItem("bgy_qr_mode") === "1";
  } catch {
    return false;
  }
}

export function isPjjActive(_tier?: Tier | null): boolean {
  try {
    return localStorage.getItem("bgy_pjj_mode") === "1";
  } catch {
    return false;
  }
}

export function isKelasLocked(
  _kelasId: number | undefined | null,
  _classrooms: { id: number }[],
  _tier?: Tier | null
): boolean {
  return false;
}

export const QR_MODE_EVENT = "bgy-qr-mode";

/** Nyalakan/matikan Mode QR dan beri tahu semua komponen (hamburger, navbar, Pengaturan). */
export function setQrMode(on: boolean): void {
  try {
    localStorage.setItem("bgy_qr_mode", on ? "1" : "0");
    if (on) {
      localStorage.setItem("bgy_pjj_mode", "0");
      localStorage.setItem("bgy_auto_hadir", "0");
      localStorage.removeItem("bgy_qr_hint_seen");
    }
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(QR_MODE_EVENT));
  window.dispatchEvent(new Event("storage"));
}
