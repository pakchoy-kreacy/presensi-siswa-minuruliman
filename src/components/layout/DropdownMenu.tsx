import { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/shared/Toast";
import { PageName } from "@/types/enums";
import { isQrActive, setQrMode as saveQrMode, QR_MODE_EVENT } from "@/lib/features";
import { BookOpen, Download, Cloud, QrCode, UserCog, LogOut } from "lucide-react";
import { isAdmin, LOGOUT_REQUEST_KEY } from "@/services/staff.service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function DropdownMenu({ isOpen, onClose }: Props) {
  const { setActivePage, setupSelesai, tier: appTier } = useApp();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [qrMode, setQrMode] = useState(isQrActive(appTier));
  useEffect(() => {
    const sync = () => setQrMode(isQrActive(appTier));
    sync();
    window.addEventListener(QR_MODE_EVENT, sync);
    return () => window.removeEventListener(QR_MODE_EVENT, sync);
  }, [appTier]);
  if (!isOpen || !setupSelesai) return null;

  const canInstall = !!(window as any).__bgy_deferredPrompt;

  const handleInstall = () => {
    const promptEv = (window as any).__bgy_deferredPrompt as BeforeInstallPromptEvent | undefined;
    if (promptEv) {
      promptEv.prompt();
      promptEv.userChoice.then(() => {
        (window as any).__bgy_deferredPrompt = null;
      });
    } else {
      toast("Buka di Chrome/Edge Android, lalu menu > Tambahkan ke Layar Utama");
    }
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[290]"
        onClick={onClose}
      />

      {/* Dropdown */}
      <div
        className="absolute top-[calc(100%+8px)] right-0 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl z-[400] min-w-[220px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {isAdmin() && (
          <button
            onClick={() => { setActivePage(PageName.GURU); onClose(); }}
            className="w-full min-h-[50px] flex items-center gap-3 px-4 py-[12px] text-[0.85rem] font-bold text-white border-none cursor-pointer text-left"
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
          >
            <UserCog size={17} /> Menu Admin
          </button>
        )}
        <button
          onClick={() => { setActivePage(PageName.PETUNJUK); onClose(); }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <BookOpen size={16} /> Petunjuk
        </button>

        {(
          <button
            role="switch"
            aria-checked={qrMode}
            onClick={() => {
              const newVal = !qrMode;
              saveQrMode(newVal);
              onClose();
              toast(newVal ? "Mode QR aktif — tombol tengah jadi Scan QR" : "Mode QR mati — tombol tengah kembali ke Presensi");
            }}
            className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <QrCode size={16} /> Mode QR
            <span className={`ml-auto relative w-[36px] h-[20px] rounded-full transition-colors ${qrMode ? "bg-[#0ea5a0]" : "bg-[var(--border)]"}`}>
              <span className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow transition-all ${qrMode ? "left-[18px]" : "left-[2px]"}`} />
            </span>
          </button>
        )}

        {isAuthenticated && (
          <button
            onClick={() => { setActivePage(PageName.CLOUD_SETTINGS); onClose(); }}
            className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
          >
            <Cloud size={16} /> Cloud Settings
          </button>
        )}

        <div className="h-px bg-[var(--border)] mx-0" />


        <button
          onClick={handleInstall}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[var(--text)] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <Download size={16} /> Install Aplikasi
        </button>

        <div className="h-px bg-[var(--border)] mx-0" />
        <button
          onClick={() => { sessionStorage.setItem(LOGOUT_REQUEST_KEY, "1"); setActivePage(PageName.PENGATURAN); onClose(); }}
          className="w-full min-h-[46px] flex items-center gap-3 px-4 py-[12px] text-[0.83rem] font-semibold text-[#ef4444] hover:bg-[var(--input-bg)] transition-colors border-none bg-transparent cursor-pointer text-left"
        >
          <LogOut size={16} /> Keluar
        </button>

      </div>
    </>
  );
}
