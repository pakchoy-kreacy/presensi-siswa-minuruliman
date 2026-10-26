import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { LogoUpload } from "@/components/shared/LogoUpload";
import { DropdownMenu } from "@/components/layout/DropdownMenu";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { Moon, Sun, Menu } from "lucide-react";

export function Header() {
  const { darkMode, toggleDarkMode, setupSelesai } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header
      className="sticky top-0 z-[300] px-3"
      style={{
        background: darkMode
          ? "linear-gradient(135deg, #0d4a47, #1a3a4a)"
          : "linear-gradient(135deg, #0ea5a0, #0d7a8a, #2d6a7f)",
        boxShadow: "0 2px 10px rgba(0,0,0,.18)",
      }}
    >
      <div className="flex items-center justify-between h-[54px]">
        <div className="flex items-center gap-[6px] sm:gap-[8px] flex-1 min-w-0">
          <LogoUpload />
          <div className="flex-1 min-w-0 h-[54px] flex items-center cursor-default" style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
            <div className="text-[0.88rem] sm:text-[1rem] font-extrabold text-white whitespace-nowrap overflow-hidden text-ellipsis leading-tight select-none">
              Presensi <span className="font-semibold opacity-80">MI Nurul Iman</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[5px] flex-shrink-0 relative">
          <SyncIndicator />
          <button
            onClick={toggleDarkMode}
            className="h-[34px] w-[34px] rounded-[8px] border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
            title="Mode gelap/terang"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {setupSelesai && (
            <>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="h-[34px] w-[34px] rounded-[8px] border-[1.5px] border-white/30 bg-white/10 text-white flex items-center justify-center flex-shrink-0 active:bg-white/25 cursor-pointer"
                title="Menu"
              >
                <Menu size={16} />
              </button>
              <DropdownMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
