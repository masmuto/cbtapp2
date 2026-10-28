import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar assignment untuk ujian ?examId=
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId");
    if (!examId) return err("examId wajib diisi.", 400);
    const exam = await db.exam.findFirst({ where: { id: examId, schoolId: ctx.schoolId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (ctx.role === "teacher" && exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian ini.", 403);

    const assignments = await db.examAssignment.findMany({
      where: { examId },
      include: {
        class: { select: { id: true, name: true } },
        proctor: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ assignments });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: tugaskan ujian ke kelas + pengawas
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const body = await req.json();
    const { examId, classId, proctorId } = body || {};
    if (!examId || !classId) return err("examId dan classId wajib diisi.", 400);
    const exam = await db.exam.findFirst({ where: { id: examId, schoolId: ctx.schoolId } });
    if (!exam) return err("Ujian tidak ditemukan.", 404);
    if (ctx.role === "teacher" && exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian ini.", 403);
    const cls = await db.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId } });
    if (!cls) return err("Kelas tidak ditemukan.", 404);
    if (proctorId) {
      const p = await db.schoolMembership.findFirst({
        where: { userId: proctorId, schoolId: ctx.schoolId, role: "proctor", status: "active" },
      });
      if (!p) return err("Pengawas tidak valid.", 400);
    }
    const existing = await db.examAssignment.findUnique({
      where: { examId_classId: { examId, classId } },
    });
    if (existing) return err("Penugasan sudah ada.", 409);
    const assignment = await db.examAssignment.create({
      data: { examId, classId, proctorId: proctorId || null },
      include: { class: { select: { name: true } }, proctor: { select: { fullName: true } } },
    });
    await audit(ctx, "CREATE_EXAM_ASSIGNMENT", "ExamAssignment", assignment.id, { examId, classId, proctorId });
    return ok({ assignment }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}

// DELETE: hapus assignment ?assignmentId=
export async function DELETE(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    if (!assignmentId) return err("assignmentId wajib diisi.", 400);
    const a = await db.examAssignment.findUnique({
      where: { id: assignmentId },
      include: { exam: { select: { schoolId: true, ownerId: true } } },
    });
    if (!a) return err("Penugasan tidak ditemukan.", 404);
    if (a.exam.schoolId !== ctx.schoolId) return err("Akses lintas sekolah ditolak.", 403);
    if (ctx.role === "teacher" && a.exam.ownerId !== ctx.userId)
      return err("Anda bukan pemilik ujian.", 403);
    await db.examAssignment.delete({ where: { id: assignmentId } });
    await audit(ctx, "DELETE_EXAM_ASSIGNMENT", "ExamAssignment", assignmentId, {});
    return ok({ ok: true });
  } catch (e) {
    return handleAuthError(e);
  }
}
