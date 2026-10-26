import { CloudOff } from "lucide-react";
import { useCloudAuth } from "@/contexts/CloudAuthContext";

/** Muncul kalau sesi cloud perangkat ini hilang (sinkron dijeda): minta masuk lagi dengan PIN. */
export function CloudVerifyBanner() {
  const { cloudEmail, needsVerify } = useCloudAuth();
  if (!needsVerify || !cloudEmail || localStorage.getItem("bgy_demo_mode") === "1") return null;

  const masukLagi = () => {
    localStorage.removeItem("presensi_staff");
    window.location.replace("/");
  };

  return (
    <div className="mx-3 mt-2 flex items-center gap-2 rounded-[10px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-2">
      <CloudOff size={16} className="text-[#d97706] flex-shrink-0" />
      <div className="flex-1 text-[0.72rem] text-[var(--text)] leading-snug">Sinkron cloud dijeda. Masuk lagi dengan PIN.</div>
      <button onClick={masukLagi} className="text-[0.72rem] font-bold text-white bg-[#0ea5a0] border-none rounded-[8px] px-3 py-[6px] cursor-pointer flex-shrink-0">
        Masuk
      </button>
    </div>
  );
}
