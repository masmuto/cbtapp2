import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: detail attempt untuk guru (lebih lengkap daripada pengawas)
// - Timeline event lengkap (bukan hanya 5 terakhir)
// - Daftar jawaban (hanya metadata: questionId, isSynced, revision, updatedAt, gradedAt)
// - TIDAK mengembalikan selectedOptionCodes/textAnswer (privacy)
// - TIDAK mengembalikan isCorrect (kunci jawaban)
export async function GET(_req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const ctx = await requireRole("teacher", "school_admin");

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true, title: true, durationMinutes: true, startAt: true, endAt: true,
            passingScore: true, ownerId: true, schoolId: true,
            allowBackNav: true, antiCheatingConfig: true,
          },
        },
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true, username: true } },
            class: { select: { id: true, name: true } },
          },
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            isSynced: true,
            revision: true,
            isCorrect: true,
            pointsAwarded: true,
            gradedAt: true,
            gradedBy: true,
            teacherComment: true,
            createdAt: true,
            updatedAt: true,
            // selectedOptionCodes & textAnswer SENGAJA TIDAK di-select (privacy)
            question: {
              select: {
                id: true, type: true, points: true, category: true, difficulty: true,
                examQuestions: { where: { examId: undefined as any }, select: { points: true, orderIndex: true } },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 200, // lebih banyak untuk timeline lengkap
        },
        proctoring: {
          include: { proctor: { select: { fullName: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);

    // Verifikasi kepemilikan
    if (attempt.exam.schoolId !== ctx.schoolId) return err("Akses lintas sekolah ditolak.", 403);
    if (ctx.role === "teacher" && attempt.exam.ownerId !== ctx.userId) {
      return err("Anda bukan pemilik ujian ini.", 403);
    }

    // Hitung total soal di ujian ini
    const totalQuestions = await db.examQuestion.count({ where: { examId: attempt.examId } });

    // Hitung jawaban terjawab
    const answeredCount = attempt.answers.filter(
      (a) => a.revision > 0 || a.isSynced
    ).length;

    // Last heartbeat
    const lastHeartbeat = attempt.events.find((e) => e.type === "HEARTBEAT");
    const now = Date.now();
    const lastActivityMs = lastHeartbeat ? new Date(lastHeartbeat.createdAt).getTime() : (attempt.startedAt ? new Date(attempt.startedAt).getTime() : 0);
    const isOnline = attempt.status === "in_progress" && (now - lastActivityMs) < 60_000;

    const remainingSec = attempt.serverEndsAt
      ? Math.max(0, Math.floor((new Date(attempt.serverEndsAt).getTime() - now) / 1000))
      : null;

    const elapsedSec = attempt.startedAt
      ? Math.floor((now - new Date(attempt.startedAt).getTime()) / 1000)
      : 0;

    const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    // Parse anti-cheating config
    let antiCheatConfig: any = null;
    try {
      antiCheatConfig = attempt.exam.antiCheatingConfig ? JSON.parse(attempt.exam.antiCheatingConfig) : null;
    } catch {}

    return ok({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        attemptNo: attempt.attemptNo,
        startedAt: attempt.startedAt,
        serverEndsAt: attempt.serverEndsAt,
        submittedAt: attempt.submittedAt,
        gradedAt: attempt.gradedAt,
        publishedAt: attempt.publishedAt,
        finalScore: attempt.finalScore,
        isPassed: attempt.isPassed,
        rawScore: attempt.rawScore,
        incidentCount: attempt.incidentCount,
        userAgent: attempt.userAgent,
        reviewNote: attempt.reviewNote,
        // Live monitoring data
        isOnline,
        lastActivityAt: lastActivityMs ? new Date(lastActivityMs).toISOString() : null,
        remainingSec,
        elapsedSec,
        progressPct,
        answeredCount,
        totalQuestions,
      },
      exam: {
        ...attempt.exam,
        antiCheatingConfig: antiCheatConfig,
      },
      student: attempt.enrollment.student,
      class: attempt.enrollment.class,
      // Timeline event lengkap
      events: attempt.events,
      // Answers metadata (tanpa jawaban)
      answers: attempt.answers.map((a) => ({
        id: a.id,
        questionId: a.questionId,
        type: a.question.type,
        category: a.question.category,
        difficulty: a.question.difficulty,
        isSynced: a.isSynced,
        revision: a.revision,
        isGraded: a.gradedAt != null,
        isCorrect: a.isCorrect, // hanya tersedia setelah submit/graded
        pointsAwarded: a.pointsAwarded,
        teacherComment: a.teacherComment,
        updatedAt: a.updatedAt,
        gradedAt: a.gradedAt,
      })),
      proctoring: attempt.proctoring,
    });
  } catch (e) {
    return handleAuthError(e);
  }
}
