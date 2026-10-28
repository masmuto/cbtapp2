import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export const generateToken = (bytes = 16) => randomBytes(bytes).toString("hex");

// Fisher-Yates shuffle deterministik berbasis seed (untuk pengacakan soal & opsi per sesi)
export function seededShuffle<T>(arr: T[], seed: string): T[] {
  const a = [...arr];
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate username otomatis berbasis NIS/NIP + suffix
export function generateUsername(prefix: string, suffix: string) {
  return `${prefix}.${suffix}`.toLowerCase().replace(/[^a-z0-9.]/g, "");
}

// Format tanggal ke Asia/Jakarta
export function formatDateID(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnlyID(date: Date | string | null | undefined) {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Status ujian display name
export const EXAM_STATUS_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Diterbitkan",
  archived: "Diarsipkan",
};

export const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  not_started: "Belum Dimulai",
  in_progress: "Sedang Berjalan",
  submitted: "Sudah Dikumpulkan",
  graded: "Sudah Dinilai",
  reviewed: "Sudah Ditinjau",
  published: "Hasil Diterbitkan",
};

export const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super Admin",
  school_admin: "Admin Sekolah",
  teacher: "Guru",
  proctor: "Pengawas",
  student: "Siswa",
};

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "Pilihan Ganda",
  MULTIPLE_RESPONSE: "Pilihan Ganda Kompleks",
  TRUE_FALSE: "Benar / Salah",
  SHORT_ANSWER: "Isian Singkat",
  ESSAY: "Esai",
};
