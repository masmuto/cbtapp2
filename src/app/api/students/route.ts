import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";
import { hashPassword } from "@/lib/helpers";

// GET: daftar siswa di sekolah aktif, dengan filter ?classId=
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("school_admin", "teacher", "proctor");
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const enrollments = await db.studentEnrollment.findMany({
      where: classId ? { classId } : { class: { schoolId: ctx.schoolId } },
      include: {
        student: { select: { id: true, fullName: true, email: true, username: true, isActive: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const students = enrollments.map((e) => ({
      id: e.student.id,
      enrollmentId: e.id,
      fullName: e.student.fullName,
      email: e.student.email,
      username: e.student.username,
      nis: e.nis,
      classId: e.classId,
      className: e.class.name,
      status: e.status,
      isActive: e.student.isActive,
    }));
    return ok({ students });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: school_admin menambah siswa baru + enroll ke kelas
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const body = await req.json();
    const { fullName, email, username, password, classId, nis } = body || {};
    if (!fullName || !email || !username || !password || !classId)
      return err("Nama, email, username, password, dan kelas wajib diisi.", 400);
    const cls = await db.class.findFirst({ where: { id: classId, schoolId: ctx.schoolId } });
    if (!cls) return err("Kelas tidak ditemukan atau bukan milik sekolah ini.", 404);
    const dup = await db.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (dup) return err("Email atau username sudah terdaftar.", 409);
    const user = await db.user.create({
      data: {
        fullName, email, username,
        passwordHash: await hashPassword(password),
        isActive: true,
        memberships: { create: [{ schoolId: ctx.schoolId!, role: "student" }] },
        studentEnrollments: { create: [{ classId, nis: nis || null, status: "active" }] },
      },
    });
    await audit(ctx, "CREATE_STUDENT", "User", user.id, { fullName, email, classId });
    return ok({ user: { id: user.id, fullName: user.fullName, email: user.email } }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
