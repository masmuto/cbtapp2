import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar attempt untuk monitoring pengawas ATAU guru (pemilik ujian).
// - Pengawas: hanya attempt dari ujian yang ditugaskan kepadanya
// - Guru: attempt dari ujian miliknya sendiri
// - Admin sekolah: semua attempt di sekolahnya
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("proctor", "school_admin", "teacher");
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");

    // Ambil assignment sesuai peran
    const where: any = { exam: { schoolId: ctx.schoolId } };
    if (ctx.role === "proctor") where.proctorId = ctx.userId;
    // Guru: filter ujian miliknya (via assignments join exam.ownerId)
    // Kita juga ambil assignments untuk semua ujian milik guru tersebut
    if (ctx.role === "teacher") where.exam.ownerId = ctx.userId;
    if (examId) where.examId = examId;

    const assignments = await db.examAssignment.findMany({
      where,
      include: {
        exam: {
          select: {
            id: true, title: true, durationMinutes: true,
            startAt: true, endAt: true, passingScore: true, ownerId: true,
          },
        },
        class: { select: { id: true, name: true } },
      },
    });

    if (assignments.length === 0) return ok({ attempts: [] });

    const examIds = [...new Set(assignments.map((a) => a.examId))];
    const attempts = await db.examAttempt.findMany({
      where: { examId: { in: examIds } },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            class: { select: { id: true, name: true } },
          },
        },
        exam: { select: { id: true, title: true, durationMinutes: true, startAt: true, endAt: true } },
        _count: { select: { events: true, proctoring: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    // Tambah info events terakhir
    const result = await Promise.all(
      attempts.map(async (a) => {
        const recentEvents = await db.examEvent.findMany({
          where: { attemptId: a.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        const incidents = await db.examEvent.count({
          where: { attemptId: a.id, severity: { in: ["warning", "critical"] } },
        });
        return {
          id: a.id,
          status: a.status,
          attemptNo: a.attemptNo,
          startedAt: a.startedAt,
          serverEndsAt: a.serverEndsAt,
          submittedAt: a.submittedAt,
          finalScore: a.finalScore,
          incidentCount: a.incidentCount,
          totalEvents: a._count.events,
          proctoringRecords: a._count.proctoring,
          student: {
            id: a.enrollment.student.id,
            fullName: a.enrollment.student.fullName,
            email: a.enrollment.student.email,
          },
          class: { name: a.enrollment.class.name },
          exam: a.exam,
          recentEvents,
          incidents,
        };
      })
    );

    return ok({ attempts: result });
  } catch (e) {
    return handleAuthError(e);
  }
}
