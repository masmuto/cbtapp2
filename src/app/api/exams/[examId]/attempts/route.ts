import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole, resolveStudentEnrollmentForExam } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";
import { seededShuffle } from "@/lib/helpers";

// GET: ambil sesi ujian aktif untuk siswa, beserta soal (TIDAK termasuk kunci jawaban).
// Jika attempt belum ada, akan dibuatkan. Jika sudah submit, kembalikan attempt + status.
export async function GET(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("student");
    const exam = await db.exam.findFirst({
      where: { id: examId, schoolId: ctx.schoolId, status: "published" },
      include: { examQuestions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!exam) return err("Ujian tidak tersedia.", 404);

    // Cek apakah sudah ada attempt
    const enrollment = await db.studentEnrollment.findFirst({
      where: {
        studentId: ctx.userId,
        status: "active",
        class: { assignments: { some: { examId } } },
      },
      include: { attempts: { where: { examId }, orderBy: { attemptNo: "desc" } } },
    });
    if (!enrollment) return err("Anda tidak ditugaskan pada ujian ini.", 403);

    let attempt = enrollment.attempts[0];

    // Jika tidak ada attempt sama sekali → buat baru (status in_progress)
    if (!attempt) {
      // Validasi window waktu
      const now = new Date();
      if (exam.startAt && now < exam.startAt)
        return err("Ujian belum dimulai.", 400);
      if (exam.endAt && now > exam.endAt)
        return err("Waktu ujian telah berakhir.", 400);
      // Cek maxAttempts
      if ((enrollment.attempts.length || 0) >= exam.maxAttempts)
        return err("Anda telah mencapai batas percobaan ujian.", 400);

      const serverEndsAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
      // Jika endAt lebih awal dari serverEndsAt, pakai endAt
      const actualEnd = exam.endAt && exam.endAt < serverEndsAt ? exam.endAt : serverEndsAt;

      attempt = await db.examAttempt.create({
        data: {
          examId,
          enrollmentId: enrollment.id,
          status: "in_progress",
          attemptNo: 1,
          startedAt: now,
          serverEndsAt: actualEnd,
          userAgent: req.headers.get("user-agent") || null,
        },
      });
      // Catat event START
      await db.examEvent.create({
        data: { attemptId: attempt.id, type: "START", severity: "info", payload: JSON.stringify({ at: now.toISOString() }) },
      });
      await audit(ctx, "EXAM_START", "ExamAttempt", attempt.id, { examId });
    }

    // Jika attempt sudah selesai/submit, kembalikan status tanpa soal
    if (attempt.status !== "in_progress" && attempt.status !== "not_started") {
      return ok({
        attempt: {
          id: attempt.id,
          status: attempt.status,
          attemptNo: attempt.attemptNo,
          startedAt: attempt.startedAt,
          serverEndsAt: attempt.serverEndsAt,
          submittedAt: attempt.submittedAt,
          finalScore: attempt.finalScore,
          isPassed: attempt.isPassed,
        },
        exam: {
          id: exam.id,
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          allowBackNav: exam.allowBackNav,
          allowAnswerChange: exam.allowAnswerChange,
        },
        questions: null,
      });
    }

    // === BANGUN SOAL UNTUK SISWA ===
    // Untuk pengacakan: gunakan seed = attempt.id (konsisten per sesi)
    let examQuestions = exam.examQuestions;
    if (exam.shuffleQuestions) {
      examQuestions = seededShuffle(examQuestions, attempt.id);
    }

    const safeQuestions = await Promise.all(
      examQuestions.map(async (eq) => {
        const q = await db.question.findUnique({
          where: { id: eq.questionId },
          include: { options: { orderBy: { orderIndex: "asc" } } },
        });
        if (!q) return null;
        let opts = q.options.map((o) => ({
          id: o.id,
          code: o.code,
          text: o.text,
          // isCorrect sengaja TIDAK dikembalikan
        }));
        // Filter out hidden "KUNCI" option untuk SHORT_ANSWER
        if (q.type === "SHORT_ANSWER") {
          opts = opts.filter((o) => o.code !== "KUNCI");
        }
        if (exam.shuffleOptions) {
          opts = seededShuffle(opts, attempt.id + eq.id);
        }
        // Ambil jawaban siswa untuk soal ini (jika ada)
        const answer = await db.attemptAnswer.findUnique({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: eq.questionId } },
        });
        return {
          examQuestionId: eq.id,
          questionId: eq.questionId,
          orderIndex: eq.orderIndex,
          type: q.type,
          stem: q.stem,
          imageUrl: q.imageUrl,
          difficulty: q.difficulty,
          category: q.category,
          points: eq.points,
          options: opts,
          myAnswer: answer
            ? {
                selectedOptionCodes: answer.selectedOptionCodes ? JSON.parse(answer.selectedOptionCodes) : null,
                textAnswer: answer.textAnswer,
                isSynced: answer.isSynced,
                revision: answer.revision,
              }
            : null,
        };
      })
    );

    return ok({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        attemptNo: attempt.attemptNo,
        startedAt: attempt.startedAt,
        serverEndsAt: attempt.serverEndsAt,
        submittedAt: attempt.submittedAt,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        durationMinutes: exam.durationMinutes,
        allowBackNav: exam.allowBackNav,
        allowAnswerChange: exam.allowAnswerChange,
        antiCheatingConfig: exam.antiCheatingConfig ? JSON.parse(exam.antiCheatingConfig) : null,
      },
      questions: safeQuestions.filter(Boolean),
    });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: submit ujian
export async function POST(req: Request, { params }: { params: Promise<{ examId: string }> }) {
  try {
    const { examId } = await params;
    const ctx = await requireRole("student");
    const body = await req.json().catch(() => ({}));
    const { attemptId, confirm } = body || {};
    if (!attemptId) return err("attemptId wajib diisi.", 400);
    if (!confirm) return err("Konfirmasi pengumpulan diperlukan.", 400);

    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { exam: true, enrollment: { include: { student: true } } },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.enrollment.studentId !== ctx.userId) return err("Akses ditolak.", 403);
    if (attempt.status !== "in_progress") return err("Sesi sudah berakhir.", 409);

    // Lock attempt - gunakan transaction untuk idempotency
    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.examAttempt.findUnique({ where: { id: attemptId } });
      if (!fresh || fresh.status !== "in_progress") return null;

      const updated = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          status: "submitted",
          submittedAt: new Date(),
        },
      });

      // Hitung skor objektif
      const examQuestions = await tx.examQuestion.findMany({
        where: { examId: updated.examId },
        include: {
          exam: {
            select: {
              id: true, type: true, stem: true, points: true,
              options: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      });

      let rawScore = 0;
      let totalPossible = 0;
      let objectiveAnswered = 0;
      let essayCount = 0;

      for (const eq of examQuestions) {
        const q = eq.exam;
        totalPossible += eq.points;
        const ans = await tx.attemptAnswer.findUnique({
          where: { attemptId_questionId: { attemptId, questionId: eq.questionId } },
        });
        if (!ans) continue;
        // Auto-grade untuk MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
        if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
          objectiveAnswered++;
          const correct = q.options.find((o) => o.isCorrect);
          if (ans.selectedOptionCodes && correct) {
            const selected = JSON.parse(ans.selectedOptionCodes) as string[];
            if (selected.includes(correct.code)) {
              await tx.attemptAnswer.update({
                where: { id: ans.id },
                data: { isCorrect: true, pointsAwarded: eq.points, gradedAt: new Date(), gradedBy: "system" },
              });
              rawScore += eq.points;
            } else {
              await tx.attemptAnswer.update({
                where: { id: ans.id },
                data: { isCorrect: false, pointsAwarded: 0, gradedAt: new Date(), gradedBy: "system" },
              });
            }
          }
        } else if (q.type === "SHORT_ANSWER") {
          objectiveAnswered++;
          const correct = q.options.find((o) => o.code === "KUNCI");
          if (correct && ans.textAnswer) {
            const isMatch = ans.textAnswer.trim().toLowerCase() === correct.text.trim().toLowerCase();
            await tx.attemptAnswer.update({
              where: { id: ans.id },
              data: {
                isCorrect: isMatch,
                pointsAwarded: isMatch ? eq.points : 0,
                gradedAt: new Date(),
                gradedBy: "system",
              },
            });
            if (isMatch) rawScore += eq.points;
          }
        } else if (q.type === "MULTIPLE_RESPONSE") {
          objectiveAnswered++;
          const correctCodes = q.options.filter((o) => o.isCorrect).map((o) => o.code);
          if (ans.selectedOptionCodes) {
            const selected = JSON.parse(ans.selectedOptionCodes) as string[];
            const isExact = correctCodes.length === selected.length &&
              correctCodes.every((c) => selected.includes(c));
            await tx.attemptAnswer.update({
              where: { id: ans.id },
              data: {
                isCorrect: isExact,
                pointsAwarded: isExact ? eq.points : 0,
                gradedAt: new Date(),
                gradedBy: "system",
              },
            });
            if (isExact) rawScore += eq.points;
          }
        } else if (q.type === "ESSAY") {
          essayCount++;
        }
      }

      // Update attempt status
      const hasEssay = essayCount > 0;
      const finalScore = totalPossible > 0 ? Math.round((rawScore / totalPossible) * 100) : 0;
      // Note: finalScore ini hanya dari soal objektif, akan dihitung ulang setelah essay dinilai
      const attemptUpdate = await tx.examAttempt.update({
        where: { id: attemptId },
        data: {
          rawScore,
          finalScore: hasEssay ? null : finalScore,
          isPassed: hasEssay ? null : finalScore >= attempt.exam.passingScore,
          status: hasEssay ? "submitted" : "graded",
          gradedAt: hasEssay ? null : new Date(),
        },
      });

      await tx.examEvent.create({
        data: { attemptId, type: "SUBMIT", severity: "info", payload: JSON.stringify({ rawScore, totalPossible, hasEssay }) },
      });

      return attemptUpdate;
    });

    if (!result) return err("Sesi sudah berakhir atau tidak dapat diubah.", 409);

    await audit(ctx, "EXAM_SUBMIT", "ExamAttempt", attemptId, { examId });
    return ok({
      attempt: result,
      message: result.status === "graded" ? "Ujian berhasil dikumpulkan dan dinilai otomatis." : "Ujian berhasil dikumpulkan. Menunggu koreksi esai guru.",
    });
  } catch (e) {
    return handleAuthError(e);
  }
}
