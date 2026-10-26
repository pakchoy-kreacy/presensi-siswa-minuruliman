import { useEffect, useState } from "react";
import { KeyRound, Loader2, PenLine, Plus, Trash2, UserCog, X } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/components/shared/Toast";
import { staffService, isAdmin, type StaffMember } from "@/services/staff.service";

type Form = { id?: number; nama: string; kelasId: string; pin: string };
const empty: Form = { nama: "", kelasId: "", pin: "" };

/** Admin: kelola guru, kelas walinya, dan PIN masuk. */
export function GuruPage() {
  const { classrooms } = useApp();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => staffService.list().then(setStaff).catch((e) => toast(e.message));
  useEffect(() => { if (isAdmin()) load(); }, []);

  if (!isAdmin()) {
    return <div className="flex-1 p-6 text-center text-[0.8rem] text-[var(--text-light)]">Halaman ini khusus admin.</div>;
  }

  const kelasNama = (id: number | null) => classrooms.find((c) => c.id === id)?.nama || "Belum ada kelas";

  const save = async () => {
    if (!form) return;
    if (!form.nama.trim()) return toast("Nama guru wajib diisi");
    if ((!form.id || form.pin) && !/^\d{4,6}$/.test(form.pin)) return toast("PIN harus 4–6 angka");
    setBusy(true);
    try {
      await staffService.save({ id: form.id, nama: form.nama.trim(), kelasId: form.kelasId ? Number(form.kelasId) : null, pin: form.pin || undefined });
      toast(form.id ? "Data guru disimpan" : "Guru ditambahkan");
      setForm(null);
      load();
    } catch (e: any) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: StaffMember) => {
    if (!confirm(`Hapus ${s.nama}? Guru ini tidak bisa masuk lagi.`)) return;
    try {
      await staffService.remove(s.id);
      toast("Guru dihapus");
      load();
    } catch (e: any) {
      toast(e.message);
    }
  };

  const input = "w-full px-3 py-[10px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--input-bg)] text-[var(--text)] text-[0.85rem] outline-none focus:border-[#0ea5a0] font-[inherit] mb-3";

  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[calc(100px+var(--ticker-h,0px))] lg:pb-4">
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.85rem] font-bold flex items-center gap-2 mb-1"><UserCog size={17} className="text-[#0ea5a0]" /> Kelola Guru</div>
        <p className="text-[0.72rem] text-[var(--text-light)] mb-3">
          Guru masuk dengan memilih nama lalu mengetik PIN. Guru bisa mengubah kelas walinya sendiri; kelas lain hanya bisa dilihat.
        </p>
        <button
          onClick={() => setForm({ ...empty })}
          className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[10px] text-white font-bold text-[0.82rem] border-none cursor-pointer"
          style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
        >
          <Plus size={15} /> Tambah Guru
        </button>
      </div>

      {!staff ? (
        <div className="flex justify-center p-6"><Loader2 className="animate-spin text-[var(--text-light)]" /></div>
      ) : staff.length === 0 ? (
        <div className="text-center text-[0.78rem] text-[var(--text-light)] p-6">Belum ada guru.</div>
      ) : (
        staff.map((s) => (
          <div key={s.id} className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-3 mb-2 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[0.85rem] font-bold text-[var(--text)] truncate">{s.nama}</div>
              <div className="text-[0.7rem] text-[var(--text-light)]">Wali kelas: {kelasNama(s.kelasId)}</div>
            </div>
            <button onClick={() => setForm({ id: s.id, nama: s.nama, kelasId: s.kelasId ? String(s.kelasId) : "", pin: "" })} className="w-9 h-9 rounded-full bg-[#0ea5a0]/10 text-[#0ea5a0] border-none cursor-pointer flex items-center justify-center" title="Ubah / reset PIN">
              <PenLine size={15} />
            </button>
            <button onClick={() => remove(s)} className="w-9 h-9 rounded-full bg-red-500/10 text-red-600 border-none cursor-pointer flex items-center justify-center" title="Hapus">
              <Trash2 size={15} />
            </button>
          </div>
        ))
      )}

      {form && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end lg:items-center justify-center" onClick={() => setForm(null)}>
          <div className="bg-[var(--card-bg)] rounded-t-2xl lg:rounded-2xl w-full max-w-[420px] px-4 pt-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center mb-4">
              <div className="flex-1 text-[0.9rem] font-bold">{form.id ? "Ubah Guru" : "Tambah Guru"}</div>
              <button onClick={() => setForm(null)} className="bg-transparent border-none cursor-pointer text-[var(--text-light)]"><X size={18} /></button>
            </div>
            <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-1 uppercase">Nama guru</label>
            <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Siti Aminah, S.Pd" className={input} />
            <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-1 uppercase">Wali kelas</label>
            <select value={form.kelasId} onChange={(e) => setForm({ ...form, kelasId: e.target.value })} className={input}>
              <option value="">Belum ada kelas</option>
              {classrooms.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
            <label className="block text-[0.68rem] font-bold text-[var(--text-light)] mb-1 uppercase flex items-center gap-1">
              <KeyRound size={12} /> {form.id ? "PIN baru (kosongkan kalau tidak diganti)" : "PIN (4–6 angka)"}
            </label>
            <input inputMode="numeric" maxLength={6} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} placeholder="1234" className={`${input} tracking-[0.3em]`} />
            <button
              onClick={save}
              disabled={busy}
              className="w-full py-[11px] rounded-[10px] text-white font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)" }}
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
