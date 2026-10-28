import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: detail attempt + jawaban untuk grading esai (guru/admin pemilik exam)
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: { select: { id: true, title: true, ownerId: true, schoolId: true, passingScore: true, publishMode: true } },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true, username: true } },
            class: { select: { id: true, name: true } },
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true, type: true, stem: true, points: true,
                options: { orderBy: { orderIndex: "asc" } },
              },
            },
          },
        },
        proctoring: true,
      },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.exam.schoolId !== ctx.schoolId) return err("Akses lintas sekolah ditolak.", 403);
    if (ctx.role === "teacher" && attempt.exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian ini.", 403);

    return ok({ attempt });
  } catch (e) {
    return handleAuthError(e);
  }
}

// PATCH: beri nilai esai + komentar
// Body: { questionId, pointsAwarded, teacherComment }
export async function PATCH(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: { select: { ownerId: true, schoolId: true, passingScore: true } } },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.exam.schoolId !== ctx.schoolId) return err("Akses lintas sekolah ditolak.", 403);
    if (ctx.role === "teacher" && attempt.exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian ini.", 403);
    if (attempt.status !== "submitted" && attempt.status !== "graded")
      return err("Sesi belum siap dinilai atau sudah dipublikasi.", 409);

    const body = await req.json();
    const { questionId, pointsAwarded, teacherComment } = body || {};
    if (!questionId) return err("questionId wajib diisi.", 400);
    if (typeof pointsAwarded !== "number" || pointsAwarded < 0)
      return err("pointsAwarded harus angka >= 0.", 400);

    const existingAnswer = await db.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });
    if (!existingAnswer) return err("Jawaban tidak ditemukan.", 404);

    const oldScore = existingAnswer.pointsAwarded;
    const updated = await db.attemptAnswer.update({
      where: { id: existingAnswer.id },
      data: {
        pointsAwarded,
        teacherComment: teacherComment ?? null,
        gradedAt: new Date(),
        gradedBy: ctx.userId,
        isCorrect: pointsAwarded > 0,
      },
    });

    // Hitung ulang skor total
    const allAnswers = await db.attemptAnswer.findMany({
      where: { attemptId },
      include: { question: { include: { examQuestions: { where: { examId: attempt.examId } } } } },
    });
    let rawScore = 0;
    let totalPossible = 0;
    let allGraded = true;
    for (const a of allAnswers) {
      const eq = a.question.examQuestions[0];
      if (eq) {
        totalPossible += eq.points;
        if (a.pointsAwarded != null) rawScore += a.pointsAwarded;
        else allGraded = false;
      }
    }
    const finalScore = totalPossible > 0 ? Math.round((rawScore / totalPossible) * 100) : 0;

    // Catat revisi
    if (oldScore !== pointsAwarded) {
      await db.gradeRevision.create({
        data: {
          attemptId,
          changedById: ctx.userId,
          oldScore: oldScore,
          newScore: pointsAwarded,
          reason: `Koreksi esai (${teacherComment || "tanpa komentar"})`,
        },
      });
    }

    const newStatus = allGraded ? "graded" : "submitted";
    const updatedAttempt = await db.examAttempt.update({
      where: { id: attemptId },
      data: {
        rawScore,
        finalScore: allGraded ? finalScore : null,
        isPassed: allGraded ? finalScore >= attempt.exam.passingScore : null,
        status: newStatus,
        gradedAt: allGraded ? new Date() : null,
      },
    });

    await audit(ctx, "GRADE_ANSWER", "AttemptAnswer", updated.id, { attemptId, questionId, pointsAwarded, oldScore });
    return ok({ answer: updated, attempt: updatedAttempt });
  } catch (e) {
    return handleAuthError(e);
  }
}
