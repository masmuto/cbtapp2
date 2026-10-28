import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: hasil ujian untuk guru/admin (semua attempt) atau siswa (hanya yang published).
// ?examId= wajib untuk guru/admin. Siswa wajib pakai examId juga.
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin", "student");
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    if (!examId) return err("examId wajib diisi.", 400);

    const exam = await db.exam.findFirst({ where: { id: examId, schoolId: ctx.schoolId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);

    if (ctx.role === "student") {
      // Siswa hanya melihat attempt miliknya yang sudah published
      const enrollments = await db.studentEnrollment.findMany({
        where: { studentId: ctx.userId, status: "active" },
        select: { id: true },
      });
      const attempts = await db.examAttempt.findMany({
        where: {
          examId,
          enrollmentId: { in: enrollments.map((e) => e.id) },
          status: "published",
        },
        include: {
          exam: { select: { id: true, title: true, passingScore: true, subject: { select: { name: true } } } },
        },
      });
      return ok({
        results: attempts.map((a) => ({
          id: a.id,
          finalScore: a.finalScore,
          isPassed: a.isPassed,
          submittedAt: a.submittedAt,
          publishedAt: a.publishedAt,
          attemptNo: a.attemptNo,
          examTitle: a.exam.title,
          subjectName: a.exam.subject.name,
          passingScore: a.exam.passingScore,
        })),
      });
    }

    // Guru/admin: semua attempt
    if (ctx.role === "teacher" && exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian.", 403);

    const attempts = await db.examAttempt.findMany({
      where: { examId },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true, username: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const results = attempts.map((a) => ({
      id: a.id,
      status: a.status,
      attemptNo: a.attemptNo,
      rawScore: a.rawScore,
      finalScore: a.finalScore,
      isPassed: a.isPassed,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      gradedAt: a.gradedAt,
      publishedAt: a.publishedAt,
      incidentCount: a.incidentCount,
      student: {
        id: a.enrollment.student.id,
        fullName: a.enrollment.student.fullName,
        email: a.enrollment.student.email,
        username: a.enrollment.student.username,
      },
      className: a.enrollment.class.name,
    }));
    return ok({ results, exam: { id: exam.id, title: exam.title, passingScore: exam.passingScore } });
  } catch (e) {
    return handleAuthError(e);
  }
}
