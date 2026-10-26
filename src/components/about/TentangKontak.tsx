import { Info, MessageCircle, ExternalLink } from "lucide-react";
import { APP_URL, MAIN_SITE_URL, PLUS_PRICE, PRO_PRICE } from "@/lib/constants";

export function TentangKontak() {
  return (
    <div className="flex-1 px-[14px] pt-[14px] pb-[calc(100px+var(--ticker-h,0px))] lg:pb-4">
      {/* Tentang */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.85rem] font-bold flex items-center gap-[8px] mb-3">
          <Info size={18} className="text-[#0ea5a0]" /> Tentang
        </div>

        <div className="text-[0.8rem] text-[var(--text)] leading-[1.8] mb-3">
          <b><i>Presensi Yuk</i> | Siswa</b> — v1.0.0
        </div>

        <p className="text-[0.78rem] text-[var(--text-light)] leading-[1.8] mb-3">
          Aplikasi presensi sekolah paling sederhana untuk guru Indonesia.
          Dirancang dengan filosofi <b>Offline First</b> dan <b>Mobile First</b> —
          seluruh fitur inti berjalan tanpa koneksi internet.
        </p>

        <div className="text-[0.74rem] text-[var(--text-light)] leading-[1.7]">
          <div className="flex gap-2 mb-1">
            <span className="font-semibold text-[#0ea5a0]">Visi:</span>
            <span>Presensi 1 kelas selesai dalam <b>&lt;30 detik</b></span>
          </div>
          <div className="flex gap-2 mb-1">
            <span className="font-semibold text-[#0ea5a0]">FREE:</span>
            <span>1 kelas (10 siswa), offline penuh, rekap & export. 30 hari pertama coba PRO gratis.</span>
          </div>
          <div className="flex gap-2 mb-1">
            <span className="font-semibold text-[#0ea5a0]">PLUS:</span>
            <span>4 kelas (25 siswa), cloud sync 1 perangkat, backup, Mode PJJ — {PLUS_PRICE}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-[#0ea5a0]">PRO:</span>
            <span>Kelas & siswa tanpa batas, Mode QR, edit kalender, 3 perangkat — {PRO_PRICE}</span>
          </div>
        </div>
      </div>

      {/* Kontak */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-[14px] mb-3">
        <div className="text-[0.85rem] font-bold flex items-center gap-[8px] mb-3">
          <MessageCircle size={18} className="text-[#0ea5a0]" /> Kontak
        </div>

        <p className="text-[0.78rem] text-[var(--text-light)] mb-4">
          Untuk bantuan, kritik, saran, atau kolaborasi:
        </p>

        <div className="flex flex-col gap-[10px]">
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-[11px] rounded-[10px] bg-[#0ea5a0]/10 border-2 border-[#0ea5a0] text-[#0ea5a0] font-bold text-[0.82rem] no-underline hover:bg-[#0ea5a0]/20 transition-colors"
          >
            <ExternalLink size={18} />
            <div className="flex-1 text-left">
              <div className="text-[0.85rem] font-extrabold">Presensi Yuk</div>
              <div className="text-[0.65rem] opacity-80">presiswa.bantuguruyuk.web.id</div>
            </div>
          </a>

          <a
            href={MAIN_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-[11px] rounded-[10px] border-[1.5px] border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] font-bold text-[0.82rem] no-underline hover:border-[#0ea5a0] transition-colors"
          >
            <ExternalLink size={18} className="text-[#0ea5a0]" />
            bantuguruyuk.web.id
          </a>
        </div>
      </div>
    </div>
  );
}
