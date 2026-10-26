import { supabase } from "@/lib/supabase";
import { clearLocalData } from "@/lib/local-data";
import { cloudLoginService } from "@/services/cloud-login.service";
import { syncService } from "@/services/sync.service";
import { setupService } from "@/services/setup.service";

export type StaffRole = "admin" | "guru";

export interface StaffSession {
  role: StaffRole;
  staffId: number | null;
  nama: string;
  /** Kelas wali guru (id kelas lokal); null untuk admin. */
  kelasId: number | null;
  token: string;
}

export interface StaffMember {
  id: number;
  nama: string;
  kelasId: number | null;
  aktif: boolean;
}

const KEY = "presensi_staff";
const EMAIL_KEY = "presensi_cloud_email";

export function getStaff(): StaffSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s && (s.role === "admin" || s.role === "guru") ? s : null;
  } catch {
    return null;
  }
}

export const isAdmin = () => getStaff()?.role === "admin";

async function call<T = any>(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-staff-token": getStaff()?.token || "" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const staffService = {
  async listForLogin(): Promise<StaffMember[]> {
    const { ok, data } = await call<{ staff: StaffMember[] }>({ action: "list" });
    if (!ok) throw new Error(data.error || "Gagal memuat daftar guru.");
    return data.staff;
  },

  /** Masuk dengan PIN, sambungkan perangkat ke akun sekolah, lalu ambil data sekolah. */
  async login(who: "admin" | number, pin: string): Promise<void> {
    const { ok, data } = await call<any>({ action: "login", who, pin });
    if (!ok) throw new Error(data.error || "Gagal masuk.");

    // Buang data lokal sisa pemakaian sebelumnya; data sekolah diambil dari cloud.
    await clearLocalData();
    const { error } = await supabase.auth.setSession(data.session);
    if (error) throw new Error("Gagal membuat sesi. Coba lagi.");
    const conn = await cloudLoginService.connect();
    if (!conn.ok) throw new Error(conn.error);

    localStorage.setItem(EMAIL_KEY, data.email);
    const downloaded = await syncService.downloadAll(data.email);
    if (downloaded === 0) {
      if (data.role !== "admin") throw new Error("Data sekolah belum diisi admin. Minta admin masuk dan mengisi kelas dulu.");
      if (!(await setupService.sudahSetup())) await setupService.initSchool(data.email);
      await syncService.initialUpload(data.email);
    }

    const session: StaffSession = { role: data.role, staffId: data.staffId, nama: data.nama, kelasId: data.kelasId, token: data.token };
    localStorage.setItem(KEY, JSON.stringify(session));
  },

  async list(): Promise<StaffMember[]> {
    const { ok, data } = await call<{ staff: StaffMember[] }>({ action: "staff_list" });
    if (!ok) throw new Error(data.error || "Gagal memuat daftar guru.");
    return data.staff;
  },

  async save(input: { id?: number; nama: string; kelasId: number | null; pin?: string }): Promise<void> {
    const { ok, data } = await call({ action: "staff_save", ...input });
    if (!ok) throw new Error(data.error || "Gagal menyimpan guru.");
  },

  async remove(id: number): Promise<void> {
    const { ok, data } = await call({ action: "staff_delete", id });
    if (!ok) throw new Error(data.error || "Gagal menghapus guru.");
  },
};
