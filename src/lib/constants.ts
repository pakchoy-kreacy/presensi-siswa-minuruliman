import { AttendanceStatus } from "@/types/enums";

export const STATUS_HADIR: AttendanceStatus = AttendanceStatus.HADIR;
export const STATUS_SAKIT: AttendanceStatus = AttendanceStatus.SAKIT;
export const STATUS_IZIN: AttendanceStatus = AttendanceStatus.IZIN;
export const STATUS_ALPHA: AttendanceStatus = AttendanceStatus.ALPHA;

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  [AttendanceStatus.HADIR]: "Hadir",
  [AttendanceStatus.SAKIT]: "Sakit",
  [AttendanceStatus.IZIN]: "Izin",
  [AttendanceStatus.ALPHA]: "Alpha",
  [AttendanceStatus.TERLAMBAT]: "Terlambat",
};

export const STATUS_COLOR: Record<AttendanceStatus, string> = {
  [AttendanceStatus.HADIR]: "#16a34a",
  [AttendanceStatus.SAKIT]: "#b45309",
  [AttendanceStatus.IZIN]: "#1d4ed8",
  [AttendanceStatus.ALPHA]: "#dc2626",
  [AttendanceStatus.TERLAMBAT]: "#f59e0b",
};

export const STORAGE_KEY = "bgy_presensi";
export const STORAGE_DARK_KEY = "bgy_presensi_dark";

export const APP_NAME = "Presensi MI Nurul Iman";
export const SCHOOL_NAME = "MI Nurul Iman";
export const APP_BRAND = "Presensi MI Nurul Iman";

export const WIZARD_TOTAL_STEPS = 6;




// Kept for backward compat where still referenced; prefer LIMITS from @/lib/features
export const MAX_KELAS_FREE = 1;
export const MAX_STUDENTS_FREE = 10;

export const APP_URL = typeof window !== "undefined" ? window.location.origin : "";
// Logo bawaan aplikasi. LEGACY_DEFAULT_LOGO tersimpan di data sekolah lama, anggap sama dengan bawaan.
export const DEFAULT_LOGO = "/icons/nurul-192.png";
export const LEGACY_DEFAULT_LOGO = "/guru-cibisd2.png";
// Termasuk ikon bawaan versi lama (/icons/py-192-v2.png, dst.) yang filenya sudah dihapus.
export const resolveLogo = (url?: string | null) =>
  !url || url === LEGACY_DEFAULT_LOGO || /^\/icons\/py-\d+-v\d+\.png$/.test(url) ? DEFAULT_LOGO : url;

