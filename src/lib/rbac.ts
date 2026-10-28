import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export type Role = "superadmin" | "school_admin" | "teacher" | "proctor" | "student";

export type SessionContext = {
  userId: string;
  isSuperadmin: boolean;
  schoolId?: string;
  role?: Role;
};

/**
 * Helper utama untuk mengambil konteks sesi di server.
 * Membaca `activeSchoolId` dari token (ditetapkan saat login atau saat pengguna
 * memilih sekolah aktif). Tidak mempercayai input dari frontend.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    isSuperadmin: session.user.isSuperadmin,
    schoolId: session.user.activeSchoolId,
    role: session.user.activeRole as Role | undefined,
  };
}

/**
 * Wajibkan pengguna terautentikasi dengan peran tertentu.
 * Mengembalikan konteks sesi atau melempar error 403.
 */
export async function requireRole(...roles: Role[]): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("UNAUTHORIZED");
  if (ctx.isSuperadmin && roles.includes("superadmin")) return ctx;
  if (!ctx.role || !roles.includes(ctx.role)) {
    throw new Error("FORBIDDEN");
  }
  if (!ctx.schoolId && !ctx.isSuperadmin) throw new Error("NO_ACTIVE_SCHOOL");
  return ctx;
}

/**
 * Validasi bahwa pengguna memiliki akses ke entitas milik sekolah tertentu.
 * Mencegah akses lintas-sekolah.
 */
export async function requireSchoolScoped(schoolId: string): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("UNAUTHORIZED");
  if (ctx.isSuperadmin) return ctx;
  if (ctx.schoolId !== schoolId) throw new Error("FORBIDDEN_CROSS_SCHOOL");
  return ctx;
}

/**
 * Cek apakah user adalah guru dari suatu exam (untuk modifikasi exam / grading).
 */
export async function assertExamOwner(examId: string, ctx: SessionContext) {
  if (ctx.isSuperadmin) return true;
  const exam = await db.exam.findUnique({
    where: { id: examId },
    select: { ownerId: true, schoolId: true },
  });
  if (!exam) throw new Error("NOT_FOUND");
  if (exam.schoolId !== ctx.schoolId) throw new Error("FORBIDDEN_CROSS_SCHOOL");
  if (exam.ownerId !== ctx.userId && ctx.role !== "school_admin") {
    throw new Error("FORBIDDEN_NOT_OWNER");
  }
  return true;
}

/**
 * Mendapatkan enrollment siswa yang sah untuk ujian tertentu.
 * Siswa hanya boleh mengakses ujian yang ditugaskan ke kelasnya.
 */
export async function resolveStudentEnrollmentForExam(
  examId: string,
  userId: string
): Promise<{ enrollmentId: string; attemptNo: number }> {
  const assignment = await db.examAssignment.findFirst({
    where: { examId },
    include: {
      class: {
        include: {
          enrollments: {
            where: { studentId: userId, status: "active" },
          },
        },
      },
    },
  });
  if (!assignment || assignment.class.enrollments.length === 0) {
    throw new Error("FORBIDDEN_NOT_ASSIGNED");
  }
  const enrollment = assignment.class.enrollments[0];
  // Hitung attempt berikutnya
  const lastAttempt = await db.examAttempt.findFirst({
    where: { examId, enrollmentId: enrollment.id },
    orderBy: { attemptNo: "desc" },
  });
  const attemptNo = (lastAttempt?.attemptNo ?? 0) + 1;
  return { enrollmentId: enrollment.id, attemptNo };
}

/**
 * Catat audit log.
 */
export async function audit(
  ctx: SessionContext,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await db.auditLog.create({
      data: {
        schoolId: ctx.schoolId,
        actorId: ctx.userId,
        action,
        targetType,
        targetId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (e) {
    // audit tidak boleh menggagalkan flow utama
    console.error("[audit] failed:", e);
  }
}
