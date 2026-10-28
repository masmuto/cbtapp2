import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// =====================================================================
// LIVE MONITORING UNTUK GURU
// =====================================================================
// Mengembalikan ringkasan real-time semua attempt pada ujian milik guru.
// Per attempt: nomor soal terakhir dijawab, jumlah terjawab, sisa waktu,
// status online (berdasarkan heartbeat terakhir), insiden, sinkronisasi.
//
// PRIVACY: TIDAK mengembalikan jawaban siswa (selectedOptionCodes/textAnswer)
//          atau kunci jawaban. Hanya metadata monitoring.
//
// Query: ?examId=... (opsional, untuk filter satu ujian)
// =====================================================================

const HEARTBEAT_TIMEOUT_MS = 60_000; // 60 detik tanpa heartbeat = dianggap offline

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const { searchParams } = new URL(req.url);
    const examIdFilter = searchParams.get("examId");

    // Guru: ujian miliknya. Admin: semua di sekolah.
    const examWhere: any = { schoolId: ctx.schoolId };
    if (ctx.role === "teacher") examWhere.ownerId = ctx.userId;
    if (examIdFilter) examWhere.id = examIdFilter;

    const exams = await db.exam.findMany({
      where: examWhere,
      select: {
        id: true, title: true, durationMinutes: true, startAt: true, endAt: true,
        passingScore: true, shuffleQuestions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (exams.length === 0) {
      return ok({ exams: [], attempts: [], stats: { total: 0, active: 0, submitted: 0, incidents: 0 } });
    }

    const examIds = exams.map((e) => e.id);

    // Ambil semua attempt untuk ujian tersebut
    const attempts = await db.examAttempt.findMany({
      where: { examId: { in: examIds } },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true, email: true } },
            class: { select: { id: true, name: true } },
          },
        },
        answers: {
          select: {
            questionId: true,
            isSynced: true,
            revision: true,
            updatedAt: true,
          },
        },
        _count: { select: { events: true, proctoring: true } },
      },
      orderBy: [{ status: "asc" }, { startedAt: "desc" }],
    });

    // Hitung jumlah soal per exam
    const examQuestionCounts = await db.examQuestion.groupBy({
      by: ["examId"],
      where: { examId: { in: examIds } },
      _count: true,
    });
    const examCountMap = new Map(examQuestionCounts.map((eq) => [eq.examId, eq._count]));

    // Ambil heartbeat terakhir per attempt
    const now = Date.now();
    const enrichedAttempts = await Promise.all(
      attempts.map(async (a) => {
        // Last heartbeat / event
        const lastEvent = await db.examEvent.findFirst({
          where: { attemptId: a.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, type: true, createdAt: true, severity: true },
        });

        const lastHeartbeat = await db.examEvent.findFirst({
          where: { attemptId: a.id, type: "HEARTBEAT" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        });

        // Insiden kritis (warning/critical)
        const incidents = await db.examEvent.count({
          where: { attemptId: a.id, severity: { in: ["warning", "critical"] } },
        });

        // 5 event terakhir
        const recentEvents = await db.examEvent.findMany({
          where: { attemptId: a.id },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, type: true, severity: true, createdAt: true, payload: true },
        });

        // Hitung jawaban terjawab (hanya yang ada isinya — tanpa ekspos jawaban)
        const answeredCount = a.answers.filter(
          (ans) => ans.revision > 0 || ans.isSynced
        ).length;
        const totalQuestions = examCountMap.get(a.examId) ?? 0;

        // Status online berdasarkan heartbeat terakhir
        const lastActivityMs = lastHeartbeat ? new Date(lastHeartbeat.createdAt).getTime() : (a.startedAt ? new Date(a.startedAt).getTime() : 0);
        const isOnline = a.status === "in_progress" && (now - lastActivityMs) < HEARTBEAT_TIMEOUT_MS;

        // Last sync time
        const lastSync = a.answers.length > 0
          ? a.answers.reduce((max, ans) => {
              const t = new Date(ans.updatedAt).getTime();
              return t > max ? t : max;
            }, 0)
          : (a.startedAt ? new Date(a.startedAt).getTime() : 0);

        // Sisa waktu
        const remainingSec = a.serverEndsAt
          ? Math.max(0, Math.floor((new Date(a.serverEndsAt).getTime() - now) / 1000))
          : null;

        // Elapsed (detik sejak mulai)
        const elapsedSec = a.startedAt
          ? Math.floor((now - new Date(a.startedAt).getTime()) / 1000)
          : 0;

        // Total duration in sec
        const durationSec = (await db.exam.findUnique({ where: { id: a.examId }, select: { durationMinutes: true } }))?.durationMinutes ?? 60;
        const durationSecTotal = durationSec * 60;

        // Progress percentage
        const progressPct = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

        return {
          id: a.id,
          examId: a.examId,
          status: a.status,
          attemptNo: a.attemptNo,
          startedAt: a.startedAt,
          serverEndsAt: a.serverEndsAt,
          submittedAt: a.submittedAt,
          finalScore: a.finalScore,
          isPassed: a.isPassed,
          incidentCount: a.incidentCount,
          totalEvents: a._count.events,
          proctoringRecords: a._count.proctoring,
          // Real-time data
          isOnline,
          lastActivityAt: lastActivityMs ? new Date(lastActivityMs).toISOString() : null,
          lastSyncAt: lastSync ? new Date(lastSync).toISOString() : null,
          remainingSec,
          elapsedSec,
          durationSec: durationSecTotal,
          progressPct,
          answeredCount,
          totalQuestions,
          // Student info
          student: {
            id: a.enrollment.student.id,
            fullName: a.enrollment.student.fullName,
            email: a.enrollment.student.email,
          },
          class: { name: a.enrollment.class.name },
          // Recent events
          recentEvents,
          incidents,
          lastEvent,
        };
      })
    );

    // Statistik agregat
    const stats = {
      total: enrichedAttempts.length,
      active: enrichedAttempts.filter((a) => a.status === "in_progress").length,
      online: enrichedAttempts.filter((a) => a.isOnline).length,
      submitted: enrichedAttempts.filter((a) => ["submitted", "graded", "reviewed", "published"].includes(a.status)).length,
      graded: enrichedAttempts.filter((a) => ["graded", "published"].includes(a.status)).length,
      incidents: enrichedAttempts.reduce((s, a) => s + a.incidentCount, 0),
      withIncidents: enrichedAttempts.filter((a) => a.incidentCount > 0).length,
      avgProgress: enrichedAttempts.length > 0
        ? Math.round(enrichedAttempts.reduce((s, a) => s + a.progressPct, 0) / enrichedAttempts.length)
        : 0,
    };

    return ok({ exams, attempts: enrichedAttempts, stats });
  } catch (e) {
    return handleAuthError(e);
  }
}
