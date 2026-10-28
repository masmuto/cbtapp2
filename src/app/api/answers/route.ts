import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// POST: simpan/autosave jawaban (idempotent via revision number)
// Body: { attemptId, questionId, selectedOptionCodes?, textAnswer?, revision? }
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("student");
    const body = await req.json();
    const { attemptId, questionId, selectedOptionCodes, textAnswer, revision } = body || {};
    if (!attemptId || !questionId) return err("attemptId dan questionId wajib diisi.", 400);

    // Verifikasi attempt milik siswa & masih in_progress
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { enrollment: { select: { studentId: true } }, exam: { select: { allowAnswerChange: true, endAt: true } } },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.enrollment.studentId !== ctx.userId) return err("Akses ditolak.", 403);
    if (attempt.status !== "in_progress") return err("Sesi sudah berakhir.", 409);

    // Validasi tenggat berbasis server
    const now = new Date();
    if (attempt.serverEndsAt && now > attempt.serverEndsAt) {
      // Auto-submit
      await db.examAttempt.update({
        where: { id: attemptId },
        data: { status: "submitted", submittedAt: now },
      });
      await db.examEvent.create({
        data: { attemptId, type: "AUTO_SUBMIT_DEADLINE", severity: "warning", payload: JSON.stringify({ at: now.toISOString() }) },
      });
      return err("Waktu ujian telah berakhir. Jawaban otomatis dikumpulkan.", 410);
    }

    // Cek apakah soal ada di ujian
    const examQ = await db.examQuestion.findFirst({
      where: { examId: attempt.examId, questionId },
    });
    if (!examQ) return err("Soal tidak valid untuk ujian ini.", 400);

    // Cek apakah jawaban sudah ada
    const existing = await db.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId, questionId } },
    });

    // Jika jawaban tidak boleh diubah (setelah ada jawaban dan allowAnswerChange=false)
    if (existing && !attempt.exam.allowAnswerChange) {
      return err("Jawaban tidak boleh diubah untuk ujian ini.", 409);
    }

    // Idempotency: jika revision lebih rendah dari existing, tolak
    const newRevision = (revision ?? (existing?.revision ?? 0) + 1);
    if (existing && existing.revision >= newRevision) {
      return ok({
        saved: false,
        reason: "stale_revision",
        currentRevision: existing.revision,
        attemptId,
        questionId,
      });
    }

    const serializedCodes = selectedOptionCodes
      ? JSON.stringify(Array.isArray(selectedOptionCodes) ? selectedOptionCodes : [selectedOptionCodes])
      : null;

    const answer = await db.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: {
        attemptId, questionId,
        selectedOptionCodes: serializedCodes,
        textAnswer: textAnswer ?? null,
        revision: newRevision,
        isSynced: true,
      },
      update: {
        selectedOptionCodes: serializedCodes,
        textAnswer: textAnswer ?? null,
        revision: newRevision,
        isSynced: true,
      },
    });

    await db.examEvent.create({
      data: { attemptId, type: "ANSWER_SYNCED", severity: "info", payload: JSON.stringify({ questionId, revision: newRevision }) },
    });

    return ok({ saved: true, answer });
  } catch (e) {
    return handleAuthError(e);
  }
}
