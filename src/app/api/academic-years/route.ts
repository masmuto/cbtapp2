import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar tahun ajaran di sekolah aktif
export async function GET() {
  try {
    const ctx = await requireRole("school_admin", "teacher", "proctor", "student");
    const years = await db.academicYear.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: { name: "desc" },
    });
    return ok({ academicYears: years });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: school_admin membuat tahun ajaran baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const body = await req.json();
    const { name, semester, isActive, startDate, endDate } = body || {};
    if (!name || !semester) return err("Nama dan semester wajib diisi.", 400);
    if (!["GANJIL", "GENAP"].includes(semester)) return err("Semester harus GANJIL atau GENAP.", 400);
    const dup = await db.academicYear.findFirst({
      where: { schoolId: ctx.schoolId!, name, semester },
    });
    if (dup) return err("Tahun ajaran sudah ada.", 409);
    // jika isActive, set lainnya ke false
    if (isActive) {
      await db.academicYear.updateMany({
        where: { schoolId: ctx.schoolId! },
        data: { isActive: false },
      });
    }
    const ay = await db.academicYear.create({
      data: {
        schoolId: ctx.schoolId!,
        name,
        semester,
        isActive: !!isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    await audit(ctx, "CREATE_ACADEMIC_YEAR", "AcademicYear", ay.id, { name, semester });
    return ok({ academicYear: ay }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
