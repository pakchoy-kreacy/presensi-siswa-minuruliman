import { supabase } from "@/lib/supabase";
import { schoolRepo } from "@/repositories/dexie/school.repo";
import { teacherRepo } from "@/repositories/dexie/teacher.repo";
import { academicYearRepo } from "@/repositories/dexie/academic-year.repo";
import { classroomRepo } from "@/repositories/dexie/classroom.repo";
import { studentRepo } from "@/repositories/dexie/student.repo";
import { db } from "@/repositories/dexie/db";
import { generateDefaultCalendar } from "@/data/kalender-akademik";
import { Tier, Jenjang, Semester } from "@/types/enums";
import type { School, Teacher, AcademicYear, Classroom, Student } from "@/types/entities";
import { timestamp, generateId } from "@/lib/utils";
import { SCHOOL_NAME } from "@/lib/constants";

export interface SetupData {
  sekolah: string;
  jenjang: Jenjang;
  namaGuru: string;
  email: string;
  tahunAjaran: string;
  semester: Semester;
  namaKelas: string;
  siswa: { nama: string }[];
}

export const setupService = {
  async sudahSetup(): Promise<boolean> {
    const count = await db.teachers.count();
    return count > 0;
  },

  /** Pastikan HP ini punya data sekolah & guru lokal (tabel ini tidak ikut sinkron cloud). */
  async ensureLocalIdentity(nama: string, email: string): Promise<void> {
    const now = timestamp();
    let school = await schoolRepo.get();
    if (!school) {
      school = { id: generateId(), nama: SCHOOL_NAME, jenjang: Jenjang.SD, dibuatPada: now, diubahPada: now };
      await schoolRepo.save(school);
    }
    if (!(await teacherRepo.get())) {
      await teacherRepo.save({ id: generateId(), nama, email, sekolahId: school.id, tier: Tier.PRO, dibuatPada: now, diubahPada: now });
    }
  },

  /** Tahun ajaran baru (Juli–Juni) beserta kalender bawaan. */
  async buatTahunAjaran(guruId: number, startYear: number, id: number = generateId()): Promise<AcademicYear> {
    const label = `${startYear}/${startYear + 1}`;
    const academicYear: AcademicYear = {
      id,
      label,
      tanggalMulai: `${startYear}-07-01`,
      tanggalSelesai: `${startYear + 1}-06-30`,
      semesterAktif: new Date().getMonth() >= 6 ? Semester.GANJIL : Semester.GENAP,
      guruId,
    };
    await academicYearRepo.save(academicYear);
    await db.calendarEntries.bulkPut(generateDefaultCalendar(academicYear.id, label));
    return academicYear;
  },

  /** Pastikan ada tahun ajaran. Kalau kelas merujuk tahun ajaran yang hilang, pakai id itu supaya kelas tersambung lagi. */
  async ensureAcademicYear(guruId: number): Promise<void> {
    if (await academicYearRepo.getActive()) return;
    const today = new Date();
    const startYear = today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
    const kelas = await classroomRepo.getAll();
    const idKelas = kelas.find((k) => k.tahunAjaranId)?.tahunAjaranId;
    await this.buatTahunAjaran(guruId, startYear, idKelas || generateId());
  },

  /** Data awal sekolah saat admin pertama kali masuk dan cloud masih kosong (tanpa kelas; kelas diisi admin). */
  async initSchool(email: string): Promise<void> {
    const now = timestamp();
    const school: School = { id: generateId(), nama: SCHOOL_NAME, jenjang: Jenjang.SD, dibuatPada: now, diubahPada: now };
    await schoolRepo.save(school);

    const teacher: Teacher = { id: generateId(), nama: "Admin", email, sekolahId: school.id, tier: Tier.PRO, dibuatPada: now, diubahPada: now };
    await teacherRepo.save(teacher);

    await this.ensureAcademicYear(teacher.id);
  },

  async executeSetup(data: SetupData): Promise<void> {
    const now = timestamp();
    const normalizedEmail = data.email.toLowerCase().trim();

    const school: School = {
      id: generateId(),
      nama: data.sekolah,
      jenjang: data.jenjang,
      dibuatPada: now,
      diubahPada: now,
    };
    await schoolRepo.save(school);

    const teacher: Teacher = {
      id: generateId(),
      nama: data.namaGuru,
      email: data.email,
      sekolahId: school.id,
      tier: Tier.PRO,
      dibuatPada: now,
      diubahPada: now,
    };
    await teacherRepo.save(teacher);

    const [startStr] = data.tahunAjaran.split("/");
    const startYear = parseInt(startStr);
    const academicYear: AcademicYear = {
      id: generateId(),
      label: data.tahunAjaran,
      tanggalMulai: `${startYear}-07-01`,
      tanggalSelesai: `${startYear + 1}-06-30`,
      semesterAktif: data.semester,
      guruId: teacher.id,
    };
    await academicYearRepo.save(academicYear);

    const classroom: Classroom = {
      id: generateId(),
      nama: data.namaKelas,
      tahunAjaranId: academicYear.id,
      guruId: teacher.id,
      statusAktif: true,
      dibuatPada: now,
      diubahPada: now,
    };
    await classroomRepo.save(classroom);

    if (data.siswa.length > 0) {
      const students: Student[] = data.siswa.map((s, i) => ({
        id: generateId() + i,
        kelasId: classroom.id,
        nama: s.nama,
        urutan: i + 1,
        statusAktif: true,
        dibuatPada: now,
        diubahPada: now,
      }));
      await studentRepo.bulkSave(students);
    }

    const calendarEntries = generateDefaultCalendar(academicYear.id, data.tahunAjaran);
    await db.calendarEntries.bulkPut(calendarEntries);
  },
};
