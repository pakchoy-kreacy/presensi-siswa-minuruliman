import { useApp } from "@/contexts/AppContext";
import { PageName } from "@/types/enums";
import { isAdmin } from "@/services/staff.service";
import {
  ClipboardCheck,
  BarChart3,
  Users,
  Calendar,
  BookOpen,
  Info,
  Settings,
  Database,
  School,
  GraduationCap,
  UserCog,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  page: PageName;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { page: PageName.PRESENSI, label: "Presensi", icon: ClipboardCheck },
  { page: PageName.REKAP, label: "Rekap", icon: BarChart3 },
  { page: PageName.SISWA, label: "Siswa", icon: Users },
  { page: PageName.KALENDER, label: "Kalender", icon: Calendar },
  { page: PageName.PETUNJUK, label: "Panduan", icon: BookOpen },
  { page: PageName.PENGATURAN, label: "Pengaturan", icon: Settings },
  { page: PageName.BACKUP, label: "Backup", icon: Database },
];

export function Sidebar() {
  const {
    setupSelesai,
    school,
    teacher,
    classrooms,
    activeClassroom,
    activePage,
    setActivePage,
    setActiveClassroom,
  } = useApp();

  if (!setupSelesai) return null;

  return (
    <aside
      className="hidden lg:flex flex-col w-64 flex-shrink-0 min-h-[calc(100vh-3.5rem)] border-r border-[var(--border)] bg-[var(--card-bg)] sticky top-14"
    >
      {/* Info Sekolah & Guru */}
      <div className="px-4 pt-4 pb-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <School size={14} className="text-[var(--text-light)]" />
          <span className="text-[0.72rem] font-semibold text-[var(--text-light)] truncate">
            {school?.nama || "Sekolah"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <GraduationCap size={14} className="text-[var(--text-light)]" />
          <span className="text-[0.72rem] text-[var(--text-light)] truncate">
            {teacher?.nama || "Guru"}
          </span>
        </div>
      </div>

      {/* Kelola Sekolah (admin): di atas daftar kelas agar mudah ditemukan */}
      {isAdmin() && (
        <div className="px-3 pt-3">
          <button
            onClick={() => setActivePage(PageName.GURU)}
            className={`w-full flex items-center gap-2 px-3 py-[10px] rounded-xl text-left text-[0.82rem] font-bold text-white border-none cursor-pointer ${activePage === PageName.GURU ? "ring-2 ring-[#0ea5a0]/40" : ""}`}
            style={{ background: "linear-gradient(135deg, #0ea5a0, #0d7a8a)" }}
          >
            <UserCog size={16} /> Kelola Sekolah
          </button>
        </div>
      )}

      {/* Daftar Kelas */}
      <div className="px-3 py-3 border-b border-[var(--border)]">
        <div className="flex items-center mb-2 px-1">
          <div className="flex-1 text-[0.6rem] font-bold uppercase tracking-[0.8px] text-[var(--text-light)]">Kelas</div>
          {isAdmin() && (
            <button onClick={() => setActivePage(PageName.SISWA)} className="text-[0.68rem] font-bold text-[#0ea5a0] bg-transparent border-none cursor-pointer p-0">
              Kelola kelas
            </button>
          )}
        </div>
        {classrooms.map((cls) => {
          const isActive = activeClassroom?.id === cls.id;
          return (
            <button
              key={cls.id}
              onClick={() => {
                setActiveClassroom(cls);
                setActivePage(PageName.PRESENSI);
              }}
              className={`w-full flex items-center gap-2 px-3 py-[8px] rounded-lg text-left text-[0.8rem] font-semibold transition-colors mb-[2px] ${
                isActive
                  ? "bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                  : "text-[var(--text)] hover:bg-[var(--input-bg)]"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isActive ? "bg-[#0ea5a0]" : "bg-[var(--border)]"
                }`}
              />
              <span className="truncate">{cls.nama}</span>
              {isActive && (
                <span className="ml-auto text-[0.6rem] text-[#0ea5a0] font-medium">
                  aktif
                </span>
              )}
            </button>
          );
        })}
        {classrooms.length === 0 && (
          <div className="text-[0.7rem] text-[var(--text-light)] px-3 py-2">
            Belum ada kelas
          </div>
        )}

      </div>

      {/* Navigasi Utama */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="text-[0.6rem] font-bold uppercase tracking-[0.8px] text-[var(--text-light)] mb-2 px-1">
          Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.page}
              onClick={() => setActivePage(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-[8px] rounded-lg text-left text-[0.8rem] font-semibold transition-colors mb-[2px] ${
                isActive
                  ? "bg-[rgba(14,165,160,0.1)] text-[#0ea5a0]"
                  : "text-[var(--text)] hover:bg-[var(--input-bg)]"
              }`}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
