import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, handleAuthError } from "@/lib/api";

// GET: statistik untuk dashboard berdasarkan peran
export async function GET() {
  try {
    const ctx = await requireRole("superadmin", "school_admin", "teacher", "proctor", "student");
    const schoolId = ctx.schoolId!;

    if (ctx.isSuperadmin) {
      const [schools, users, exams, attempts] = await Promise.all([
        db.school.count(),
        db.user.count(),
        db.exam.count(),
        db.examAttempt.count(),
      ]);
      return ok({
        role: "superadmin",
        stats: { schools, users, exams, attempts },
      });
    }

    if (ctx.role === "school_admin") {
      const [teachers, students, classes, subjects, exams, activeExams, publishedExams, attempts, inProgressAttempts] = await Promise.all([
        db.schoolMembership.count({ where: { schoolId, role: "teacher", status: "active" } }),
        db.schoolMembership.count({ where: { schoolId, role: "student", status: "active" } }),
        db.class.count({ where: { schoolId } }),
        db.subject.count({ where: { schoolId } }),
        db.exam.count({ where: { schoolId } }),
        db.exam.count({ where: { schoolId, status: "published" } }),
        db.examAttempt.count({ where: { exam: { schoolId }, status: "published" } }),
        db.examAttempt.count({ where: { exam: { schoolId } } }),
        db.examAttempt.count({ where: { exam: { schoolId }, status: "in_progress" } }),
      ]);
      return ok({
        role: "school_admin",
        stats: { teachers, students, classes, subjects, exams, activeExams, publishedExams, attempts, inProgressAttempts },
      });
    }

    if (ctx.role === "teacher") {
      const [questionBanks, questions, exams, publishedExams, attempts, needsGrading] = await Promise.all([
        db.questionBank.count({ where: { schoolId, ownerId: ctx.userId } }),
        db.question.count({ where: { questionBank: { ownerId: ctx.userId, schoolId } } }),
        db.exam.count({ where: { schoolId, ownerId: ctx.userId } }),
        db.exam.count({ where: { schoolId, ownerId: ctx.userId, status: "published" } }),
        db.examAttempt.count({ where: { exam: { ownerId: ctx.userId, schoolId } } }),
        db.examAttempt.count({ where: { exam: { ownerId: ctx.userId, schoolId }, status: "submitted" } }),
      ]);
      return ok({
        role: "teacher",
        stats: { questionBanks, questions, exams, publishedExams, attempts, needsGrading },
      });
    }

    if (ctx.role === "proctor") {
      const [assignedExams, monitoredAttempts, activeNow, incidents] = await Promise.all([
        db.examAssignment.count({ where: { proctorId: ctx.userId } }),
        db.examAttempt.count({ where: { exam: { assignments: { some: { proctorId: ctx.userId } } } } }),
        db.examAttempt.count({
          where: {
            exam: { assignments: { some: { proctorId: ctx.userId } } },
            status: "in_progress",
          },
        }),
        db.examEvent.count({
          where: {
            attempt: { exam: { assignments: { some: { proctorId: ctx.userId } } } },
            severity: { in: ["warning", "critical"] },
          },
        }),
      ]);
      return ok({
        role: "proctor",
        stats: { assignedExams, monitoredAttempts, activeNow, incidents },
      });
    }

    // student
    const enrollments = await db.studentEnrollment.findMany({
      where: { studentId: ctx.userId, status: "active" },
      select: { id: true },
    });
    const enrollmentIds = enrollments.map((e) => e.id);
    const [totalExams, upcomingExams, completedAttempts, publishedResults] = await Promise.all([
      db.examAssignment.count({
        where: { class: { enrollments: { some: { id: { in: enrollmentIds } } } }, exam: { status: "published" } },
      }),
      db.examAssignment.count({
        where: {
          class: { enrollments: { some: { id: { in: enrollmentIds } } } },
          exam: { status: "published", startAt: { gt: new Date() } },
        },
      }),
      db.examAttempt.count({ where: { enrollmentId: { in: enrollmentIds }, status: { in: ["submitted", "graded", "reviewed", "published"] } } }),
      db.examAttempt.count({ where: { enrollmentId: { in: enrollmentIds }, status: "published" } }),
    ]);
    return ok({
      role: "student",
      stats: { totalExams, upcomingExams, completedAttempts, publishedResults },
    });
  } catch (e) {
    return handleAuthError(e);
  }
}
