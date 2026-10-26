import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { staffService } from "@/services/staff.service";

/** "Ada kendala? Chat admin" ke nomor WhatsApp yang diatur admin; tidak tampil bila nomor belum diatur. */
export function TombolWaAdmin({ pesan = "Assalamualaikum, saya ada kendala di aplikasi Presensi MI Nurul Iman." }: { pesan?: string }) {
  const [wa, setWa] = useState<string | null>(null);
  useEffect(() => { staffService.info().then((i) => setWa(i.adminWa)); }, []);
  if (!wa) return null;
  return (
    <a
      href={`https://wa.me/${wa}?text=${encodeURIComponent(pesan)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[10px] bg-[#25D366] text-white font-bold text-[0.8rem] no-underline"
    >
      <MessageCircle size={16} /> Ada kendala? Chat admin via WhatsApp
    </a>
  );
}
