import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: detail attempt untuk pengawas (TANPA kunci jawaban)
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const ctx = await requireRole("proctor", "school_admin");
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true, title: true, durationMinutes: true,
            startAt: true, endAt: true, allowBackNav: true,
          },
        },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true, username: true } },
            class: { select: { id: true, name: true } },
          },
        },
        events: { orderBy: { createdAt: "desc" }, take: 100 },
        proctoring: { include: { proctor: { select: { fullName: true } } } },
        answers: {
          select: {
            id: true, questionId: true, isSynced: true, revision: true,
            isCorrect: true, pointsAwarded: true, gradedAt: true, createdAt: true, updatedAt: true,
          },
        },
      },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.exam.schoolId && attempt.exam.schoolId !== ctx.schoolId)
      return err("Akses lintas sekolah ditolak.", 403);

    // Verifikasi pengawas ditugaskan ke attempt ini
    if (ctx.role === "proctor") {
      const isAssigned = await db.examAssignment.findFirst({
        where: { examId: attempt.examId, proctorId: ctx.userId },
      });
      if (!isAssigned) return err("Anda tidak ditugaskan untuk ujian ini.", 403);
    }

    // Pengawas TIDAK melihat kunci jawaban — sudah difilter di select di atas
    // (answers hanya berisi metadata, tidak ada selectedOptionCodes/textAnswer)
    return ok({ attempt });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: tambah catatan pengawas / flag insiden
export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const ctx = await requireRole("proctor", "school_admin");
    const body = await req.json();
    const { type, note } = body || {};
    if (!type) return err("Tipe catatan wajib diisi.", 400);

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { select: { schoolId: true, id: true } } },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.exam.schoolId !== ctx.schoolId) return err("Akses lintas sekolah ditolak.", 403);

    if (ctx.role === "proctor") {
      const isAssigned = await db.examAssignment.findFirst({
        where: { examId: attempt.examId, proctorId: ctx.userId },
      });
      if (!isAssigned) return err("Anda tidak ditugaskan untuk ujian ini.", 403);
    }

    const allowedTypes = ["SUSPICIOUS_TAB", "SUSPICIOUS_FOCUS", "SIMILAR_ANSWER", "MANUAL_FLAG", "CAMERA_ISSUE"];
    if (!allowedTypes.includes(type)) return err("Tipe catatan tidak valid.", 400);

    const record = await db.proctoringRecord.create({
      data: {
        attemptId,
        proctorId: ctx.userId,
        type,
        note: note || null,
        status: "open",
      },
    });
    await audit(ctx, "CREATE_PROCTORING", "ProctoringRecord", record.id, { attemptId, type, note });
    return ok({ record }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
