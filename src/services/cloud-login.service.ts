import { supabase } from "@/lib/supabase";
import { getDeviceId, getDeviceName } from "@/lib/device";
import { syncService } from "@/services/sync.service";

export interface CloudDevice {
  id: number;
  name: string;
  lastActiveAt: number;
}

export type ConnectResult =
  | { ok: true; profileId: string; limit: number; deviceCount: number }
  | { ok: false; code?: "DEVICE_LIMIT" | "NOT_ALLOWED" | string; error: string; devices?: CloudDevice[]; limit?: number };

async function callApi(body: Record<string, unknown>): Promise<{ status: number; data: any }> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { status: 401, data: { error: "Verifikasi email dulu" } };
  const res = await fetch("/api/cloud-login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export const cloudLoginService = {
  /** Email yang sedang terverifikasi (sesi OTP aktif) di perangkat ini, atau null. */
  async verifiedEmail(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.email?.toLowerCase() ?? null;
  },

  /** Daftarkan perangkat ini ke akun cloud (batas perangkat dicek di server). */
  async connect(removeRowId?: number): Promise<ConnectResult> {
    const { status, data } = await callApi({
      action: removeRowId ? "remove_device" : "connect",
      rowId: removeRowId,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
    });
    if (status === 200 && data.ok) {
      // Sinkron penuh sesudah tersambung: data cloud bisa saja kosong (mis. dihapus setelah masa coba).
      syncService.resetSyncState();
      return { ok: true, ...data };
    }
    return { ok: false, code: data.code, error: data.error || "Gagal menghubungkan ke cloud.", devices: data.devices, limit: data.limit };
  },

  /** Lepas jatah perangkat ini (saat Keluar). */
  async release(): Promise<void> {
    try {
      await callApi({ action: "release", deviceId: getDeviceId() });
    } catch {
      /* offline: biarkan */
    }
  },
};
