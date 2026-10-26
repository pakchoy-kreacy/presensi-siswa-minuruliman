import { useEffect, useState } from "react";
import { Loader2, LogIn, ShieldCheck, User } from "lucide-react";
import { staffService, type StaffMember } from "@/services/staff.service";
import { APP_BRAND, DEFAULT_LOGO } from "@/lib/constants";

type Mode = "guru" | "admin";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("guru");
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [listError, setListError] = useState("");
  const [staffId, setStaffId] = useState<number | "">("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    staffService
      .listForLogin()
      .then(setStaff)
      .catch((e) => setListError(e.message || "Gagal memuat daftar guru. Periksa koneksi internet."));
  }, []);

  const submit = async () => {
    setError("");
    if (mode === "guru" && staffId === "") return setError("Pilih nama guru dulu.");
    if (!/^\d{4,6}$/.test(pin)) return setError("PIN harus 4–6 angka.");
    setBusy(true);
    try {
      await staffService.login(mode === "admin" ? "admin" : (staffId as number), pin);
      window.location.replace("/");
    } catch (e: any) {
      setError(e.message || "Gagal masuk.");
      setBusy(false);
    }
  };

  const tab = (m: Mode, label: string, Icon: typeof User) => (
    <button
      type="button"
      onClick={() => { setMode(m); setError(""); setPin(""); }}
      className={`flex-1 flex items-center justify-center gap-[6px] py-[9px] rounded-[10px] text-[0.8rem] font-bold border-none cursor-pointer ${
        mode === m ? "bg-[var(--card-bg)] text-[#0d7a8a] shadow" : "bg-transparent text-[var(--text-light)]"
      }`}
    >
      <Icon size={15} /> {label}
    </button>
  );

  const input = "w-full px-3 py-[11px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.9rem] outline-none focus:border-[#0ea5a0] font-[inherit]";

  return (
    <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-6">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-6">
          <img src={DEFAULT_LOGO} alt="Logo MI Nurul Iman" className="w-20 h-20 mx-auto mb-3" />
          <div className="text-[1.15rem] font-extrabold text-[var(--text)]">{APP_BRAND}</div>
          <div className="text-[0.78rem] text-[var(--text-light)]">Masuk untuk mengisi presensi</div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4">
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--input-bg)] mb-4">
            {tab("guru", "Guru", User)}
            {tab("admin", "Admin", ShieldCheck)}
          </div>

          {mode === "guru" && (
            <div className="mb-3">
              <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">Nama guru</label>
              {listError ? (
                <div className="text-[0.75rem] text-[#b91c1c]">{listError}</div>
              ) : !staff ? (
                <div className="flex items-center gap-2 text-[0.78rem] text-[var(--text-light)]"><Loader2 size={14} className="animate-spin" /> Memuat daftar guru…</div>
              ) : staff.length === 0 ? (
                <div className="text-[0.75rem] text-[var(--text-light)]">Belum ada guru. Admin perlu menambahkan guru dulu.</div>
              ) : (
                <select value={staffId} onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : "")} className={input}>
                  <option value="">Pilih nama</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              )}
            </div>
          )}

          <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-[5px] uppercase tracking-[0.4px]">{mode === "admin" ? "PIN admin" : "PIN"}</label>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••"
            className={`${input} tracking-[0.4em] text-center mb-3`}
          />

          {error && <div className="mb-3 p-2 rounded-lg bg-[#dc2626]/10 text-[#b91c1c] text-[0.75rem]">{error}</div>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-[11px] rounded-[10px] text-white font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {busy ? "Memuat data sekolah…" : "Masuk"}
          </button>
        </div>
        <p className="text-center text-[0.68rem] text-[var(--text-light)] mt-4">Lupa PIN? Hubungi admin sekolah.</p>
      </div>
    </div>
  );
}
