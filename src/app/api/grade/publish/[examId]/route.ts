import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// POST: publikasikan hasil ujian untuk semua siswa.
// Hanya ujian yang sudah graded semua attempt yang bisa dipublikasi.
export async function POST(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("teacher", "school_admin");
    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId },
      include: { attempts: true },
    });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (ctx.role === "teacher" && exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian.", 403);

    // Update semua attempt yang sudah graded → published
    const graded = exam.attempts.filter((a) => a.status === "graded" || a.status === "reviewed");
    if (graded.length === 0) return err("Belum ada attempt yang siap dipublikasi.", 400);

    const now = new Date();
    await db.examAttempt.updateMany({
      where: { examId, status: { in: ["graded", "reviewed"] } },
      data: { status: "published", publishedAt: now },
    });

    await audit(ctx, "PUBLISH_RESULTS", "Exam", examId, { publishedCount: graded.length });
    return ok({ published: graded.length, publishedAt: now });
  } catch (e) {
    return handleAuthError(e);
  }
}
