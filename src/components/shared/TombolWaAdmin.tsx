import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { staffService } from "@/services/staff.service";

let cache: Promise<string | null> | null = null;
const ambilWa = () => (cache ??= staffService.info().then((i) => i.adminWa));

/**
 * Chat admin lewat WhatsApp ke nomor yang diatur admin; tidak tampil bila nomor belum diatur.
 * Tanpa `teks`: tombol hijau besar. Dengan `teks`: link teks kecil.
 */
export function TombolWaAdmin({ pesan = "Assalamualaikum, saya ada kendala di aplikasi Presensi MI Nurul Iman.", teks }: { pesan?: string; teks?: string }) {
  const [wa, setWa] = useState<string | null>(null);
  useEffect(() => { ambilWa().then(setWa); }, []);
  if (!wa) return null;
  const href = `https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`;
  if (teks) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#128C7E] no-underline">
        <MessageCircle size={14} /> {teks}
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[10px] bg-[#25D366] text-white font-bold text-[0.8rem] no-underline"
    >
      <MessageCircle size={16} /> Ada kendala? Chat admin via WhatsApp
    </a>
  );
}
