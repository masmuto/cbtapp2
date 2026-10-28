import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar ujian di sekolah aktif.
//  - teacher: ujian miliknya
//  - school_admin: semua ujian
//  - student: ujian published yang ditugaskan ke kelasnya
//  - proctor: ujian yang ditugaskan kepadanya
export async function GET() {
  try {
    const ctx = await requireRole("school_admin", "teacher", "proctor", "student");
    let exams: any[] = [];
    if (ctx.role === "school_admin") {
      exams = await db.exam.findMany({
        where: { schoolId: ctx.schoolId },
        include: {
          subject: { select: { name: true, code: true } },
          owner: { select: { fullName: true } },
          _count: { select: { examQuestions: true, assignments: true, attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (ctx.role === "teacher") {
      exams = await db.exam.findMany({
        where: { schoolId: ctx.schoolId, ownerId: ctx.userId },
        include: {
          subject: { select: { name: true, code: true } },
          _count: { select: { examQuestions: true, assignments: true, attempts: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (ctx.role === "proctor") {
      const assignments = await db.examAssignment.findMany({
        where: { proctorId: ctx.userId },
        include: {
          exam: {
            include: {
              subject: { select: { name: true, code: true } },
              owner: { select: { fullName: true } },
              _count: { select: { examQuestions: true, attempts: true } },
            },
          },
          class: { select: { name: true } },
        },
      });
      exams = assignments.map((a) => ({
        ...a.exam,
        assignmentClass: a.class,
        assignmentId: a.id,
      }));
    } else if (ctx.role === "student") {
      // Ambil enrollment siswa
      const enrollments = await db.studentEnrollment.findMany({
        where: { studentId: ctx.userId, status: "active" },
        select: { id: true, classId: true },
      });
      if (enrollments.length === 0) return ok({ exams: [] });
      const classIds = enrollments.map((e) => e.classId);
      const assignments = await db.examAssignment.findMany({
        where: { classId: { in: classIds }, exam: { status: "published", schoolId: ctx.schoolId } },
        include: {
          exam: {
            include: {
              subject: { select: { name: true, code: true } },
              owner: { select: { fullName: true } },
              _count: { select: { examQuestions: true } },
            },
          },
          class: { select: { name: true } },
        },
      });
      // Untuk tiap exam, cek apakah siswa sudah punya attempt
      const examIds = assignments.map((a) => a.examId);
      const attempts = await db.examAttempt.findMany({
        where: {
          examId: { in: examIds },
          enrollmentId: { in: enrollments.map((e) => e.id) },
        },
      });
      const attemptMap = new Map<string, any>();
      for (const at of attempts) {
        attemptMap.set(at.examId, at);
      }
      exams = assignments.map((a) => ({
        ...a.exam,
        assignmentClass: a.class,
        myAttempt: attemptMap.get(a.examId) ?? null,
      }));
    }
    return ok({ exams });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: guru membuat ujian baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const body = await req.json();
    const {
      title, description, subjectId, academicYearId, durationMinutes,
      startAt, endAt, maxAttempts, passingScore,
      shuffleQuestions, shuffleOptions, allowBackNav, allowAnswerChange,
      showResultImmediately, publishMode, antiCheatingConfig,
    } = body || {};
    if (!title || !subjectId) return err("Judul dan mapel wajib diisi.", 400);
    const subj = await db.subject.findFirst({ where: { id: subjectId, schoolId: ctx.schoolId } });
    if (!subj) return err("Mapel tidak ditemukan.", 404);
    if (startAt && endAt && new Date(endAt) < new Date(startAt))
      return err("Waktu selesai harus setelah waktu mulai.", 400);

    const exam = await db.exam.create({
      data: {
        schoolId: ctx.schoolId!,
        subjectId,
        ownerId: ctx.userId,
        academicYearId: academicYearId || null,
        title,
        description: description || null,
        status: "draft",
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        durationMinutes: durationMinutes ?? 60,
        maxAttempts: maxAttempts ?? 1,
        passingScore: passingScore ?? 70,
        shuffleQuestions: shuffleQuestions ?? true,
        shuffleOptions: shuffleOptions ?? true,
        allowBackNav: allowBackNav ?? true,
        allowAnswerChange: allowAnswerChange ?? true,
        showResultImmediately: showResultImmediately ?? false,
        publishMode: publishMode || "manual",
        antiCheatingConfig: antiCheatingConfig ? JSON.stringify(antiCheatingConfig) : null,
      },
    });
    await audit(ctx, "CREATE_EXAM", "Exam", exam.id, { title });
    return ok({ exam }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
