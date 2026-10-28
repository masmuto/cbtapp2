import { db } from "@/lib/db";
import { getSessionContext, audit, assertExamOwner, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar exam_questions (soal yang dipakai dalam ujian ini)
// Tidak mengembalikan isCorrect. Hanya struktur.
export async function GET(_req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    await assertExamOwner(examId, ctx);
    const examQuestions = await db.examQuestion.findMany({
      where: { examId },
      orderBy: { orderIndex: "asc" },
      include: {
        exam: {
          select: {
            id: true, type: true, stem: true, points: true, difficulty: true,
            category: true, explanation: true, imageUrl: true,
            options: { orderBy: { orderIndex: "asc" }, select: { id: true, code: true, text: true, orderIndex: true } },
          },
        },
      },
    });
    return ok({ examQuestions });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: tambahkan soal ke ujian (hanya saat draft)
export async function POST(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    await assertExamOwner(examId, ctx);
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (exam.status !== "draft")
      return err("Soal hanya bisa ditambah saat ujian berstatus draft.", 409);

    const body = await req.json();
    const { questionId, points } = body || {};
    if (!questionId) return err("questionId wajib diisi.", 400);
    const q = await db.question.findFirst({
      where: { id: questionId, questionBank: { schoolId: ctx.schoolId } },
      include: { options: { orderBy: { orderIndex: "asc" } } },
    });
    if (!q) return err("Soal tidak ditemukan.", 404);

    const orderIndex = (await db.examQuestion.count({ where: { examId } }));
    const existing = await db.examQuestion.findFirst({ where: { examId, questionId } });
    if (existing) return err("Soal sudah ada di ujian ini.", 409);

    const snapshot = JSON.stringify({
      type: q.type,
      stem: q.stem,
      options: q.options.map((o) => ({ code: o.code, text: o.text, isCorrect: o.isCorrect })),
    });

    const eq = await db.examQuestion.create({
      data: {
        examId, questionId,
        orderIndex,
        points: points ?? q.points,
        snapshot,
      },
    });
    await audit(ctx, "ADD_EXAM_QUESTION", "ExamQuestion", eq.id, { examId, questionId });
    return ok({ examQuestion: eq }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}

// DELETE: hapus soal dari ujian (?examQuestionId=)
export async function DELETE(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    await assertExamOwner(examId, ctx);
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (exam.status !== "draft")
      return err("Soal hanya bisa dihapus saat ujian berstatus draft.", 409);
    const { searchParams } = new URL(req.url);
    const examQuestionId = searchParams.get("examQuestionId");
    if (!examQuestionId) return err("examQuestionId wajib diisi.", 400);
    await db.examQuestion.delete({ where: { id: examQuestionId } });
    await audit(ctx, "REMOVE_EXAM_QUESTION", "Exam", examId, { examQuestionId });
    return ok({ ok: true });
  } catch (e) {
    return handleAuthError(e);
  }
}
