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
  /** Email yang ditampilkan (email admin sekolah); guru tidak punya. */
  kontak?: string | null;
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

/** Tandai agar halaman Pengaturan langsung membuka dialog Keluar (sinkron & backup dulu di sana). */
export const LOGOUT_REQUEST_KEY = "presensi_logout_request";

async function call<T = any>(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-staff-token": getStaff()?.token || "" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Sambungkan perangkat ke akun sekolah, ambil data sekolah, lalu simpan sesi staf. */
async function finishLogin(data: any): Promise<void> {
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
  await setupService.ensureLocalIdentity(data.nama, data.email);

  const session: StaffSession = { role: data.role, staffId: data.staffId, nama: data.nama, kelasId: data.kelasId, kontak: data.kontak, token: data.token };
  localStorage.setItem(KEY, JSON.stringify(session));
}

export const staffService = {
  async listForLogin(): Promise<StaffMember[]> {
    const { ok, data } = await call<{ staff: StaffMember[] }>({ action: "list" });
    if (!ok) throw new Error(data.error || "Gagal memuat daftar guru.");
    return data.staff;
  },

  /** Masuk dengan PIN (guru, atau admin dengan who = "admin"). */
  async login(who: "admin" | number, pin: string): Promise<void> {
    const { ok, data } = await call<any>({ action: "login", who, pin });
    if (!ok) throw new Error(data.error || "Gagal masuk.");
    await finishLogin(data);
  },

  /** Admin: minta kode masuk ke email admin sekolah. */
  async sendAdminCode(email: string): Promise<void> {
    const { ok, data } = await call({ action: "admin_otp_send", email: email.toLowerCase().trim() });
    if (!ok) throw new Error(data.error || "Gagal mengirim kode.");
  },

  /** Admin: verifikasi kode dari email, lalu masuk ke akun sekolah. */
  async loginAdminWithCode(email: string, code: string): Promise<void> {
    const { data: v, error } = await supabase.auth.verifyOtp({ email: email.toLowerCase().trim(), token: code.trim(), type: "email" });
    if (error || !v.session) throw new Error("Kode salah atau sudah kedaluwarsa.");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${v.session.access_token}` },
      body: JSON.stringify({ action: "admin_otp_login" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Gagal masuk.");
    await finishLogin(data);
  },

  async setAdminPin(pin: string): Promise<void> {
    const { ok, data } = await call({ action: "admin_set_pin", pin });
    if (!ok) throw new Error(data.error || "Gagal mengganti PIN.");
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
