import { db } from "@/lib/db";
import { getSessionContext, audit, assertExamOwner, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: detail ujian (guru/admin/proctor). Tidak mengekspos kunci jawaban via API ini.
export async function GET(_req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("school_admin", "teacher", "proctor");
    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
      include: {
        subject: true,
        owner: { select: { fullName: true, email: true } },
        examQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            exam: { select: { type: true, stem: true, points: true, difficulty: true, category: true, explanation: true, questionBank: { select: { subject: { select: { name: true } } } } } },
            examRef: { select: { id: true } },
          },
        },
        assignments: {
          include: {
            class: { select: { id: true, name: true } },
            proctor: { select: { id: true, fullName: true } },
          },
        },
      },
    });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    return ok({ exam });
  } catch (e) {
    return handleAuthError(e);
  }
}

// PATCH: update konfigurasi ujian (hanya jika masih draft)
export async function PATCH(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    await assertExamOwner(examId, ctx);
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (exam.status !== "draft")
      return err("Ujian yang sudah diterbitkan tidak dapat diubah. Buat versi baru atau batalkan publikasi.", 409);

    const body = await req.json();
    const allowed = [
      "title", "description", "subjectId", "academicYearId", "durationMinutes",
      "startAt", "endAt", "maxAttempts", "passingScore",
      "shuffleQuestions", "shuffleOptions", "allowBackNav", "allowAnswerChange",
      "showResultImmediately", "publishMode", "antiCheatingConfig",
    ];
    const data: any = {};
    for (const k of allowed) {
      if (k in body) {
        if (k === "antiCheatingConfig" && body[k]) {
          data[k] = JSON.stringify(body[k]);
        } else if ((k === "startAt" || k === "endAt") && body[k]) {
          data[k] = new Date(body[k]);
        } else {
          data[k] = body[k];
        }
      }
    }
    if (data.startAt && data.endAt && new Date(data.endAt) < new Date(data.startAt))
      return err("Waktu selesai harus setelah waktu mulai.", 400);

    const updated = await db.exam.update({ where: { id: examId }, data });
    await audit(ctx, "UPDATE_EXAM", "Exam", examId, { updated: Object.keys(data) });
    return ok({ exam: updated });
  } catch (e) {
    return handleAuthError(e);
  }
}
