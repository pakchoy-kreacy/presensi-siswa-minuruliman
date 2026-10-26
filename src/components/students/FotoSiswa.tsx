import { useRef } from "react";
import { Camera, Trash2, UserRound } from "lucide-react";

/** Kecilkan foto ke 300×400 (3:4, potong tengah), JPEG ±25 KB, supaya ringan disinkron. */
async function kompres(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const W = 300, H = 400;
    const scale = Math.max(W / img.width, H / img.height);
    const sw = W / scale, sh = H / scale;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
    return canvas.toDataURL("image/jpeg", 0.7);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FotoSiswa({ value, onChange }: { value?: string; onChange: (foto: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="Foto siswa" className="w-[60px] h-[80px] rounded-lg object-cover border border-[var(--border)]" />
      ) : (
        <div className="w-[60px] h-[80px] rounded-lg bg-[var(--input-bg)] border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text-light)]">
          <UserRound size={26} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => input.current?.click()} className="flex items-center gap-1 px-3 py-[7px] rounded-lg border-[1.5px] border-[#0ea5a0] text-[#0d7a8a] text-[0.75rem] font-bold bg-transparent cursor-pointer">
          <Camera size={14} /> {value ? "Ganti foto" : "Ambil / pilih foto"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="flex items-center gap-1 text-[0.72rem] text-red-600 bg-transparent border-none cursor-pointer p-0">
            <Trash2 size={12} /> Hapus foto
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onChange(await kompres(file));
        }}
      />
    </div>
  );
}
