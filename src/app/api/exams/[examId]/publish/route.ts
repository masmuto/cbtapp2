import { db } from "@/lib/db";
import { getSessionContext, audit, assertExamOwner, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// POST: publikasikan ujian. Mengunci snapshot soal & mengaktifkan assignment.
export async function POST(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    await assertExamOwner(examId, ctx);
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { examQuestions: true, assignments: true },
    });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (exam.status !== "draft") return err("Ujian sudah diterbitkan.", 409);
    if (exam.examQuestions.length === 0) return err("Ujian belum memiliki soal.", 400);
    if (!exam.startAt || !exam.endAt) return err("Waktu mulai dan selesai wajib diisi sebelum publikasi.", 400);

    // Refresh snapshot untuk semua exam_questions
    for (const eq of exam.examQuestions) {
      const q = await db.question.findUnique({
        where: { id: eq.questionId },
        include: { options: { orderBy: { orderIndex: "asc" } } },
      });
      if (q) {
        const snap = JSON.stringify({
          type: q.type,
          stem: q.stem,
          options: q.options.map((o) => ({ code: o.code, text: o.text, isCorrect: o.isCorrect })),
        });
        await db.examQuestion.update({ where: { id: eq.id }, data: { snapshot: snap } });
      }
    }
    const updated = await db.exam.update({
      where: { id: examId },
      data: { status: "published" },
    });
    await audit(ctx, "PUBLISH_EXAM", "Exam", examId, { questionCount: exam.examQuestions.length });
    return ok({ exam: updated });
  } catch (e) {
    return handleAuthError(e);
  }
}
