import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar kelas di sekolah aktif, dengan filter optional ?academicYearId=
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("school_admin", "teacher", "proctor", "student");
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const ay = academicYearId || (await db.academicYear.findFirst({
      where: { schoolId: ctx.schoolId, isActive: true },
      orderBy: { name: "desc" },
    }))?.id;

    const where: any = { schoolId: ctx.schoolId };
    if (ay) where.academicYearId = ay;

    const classes = await db.class.findMany({
      where,
      include: {
        homeroom: { select: { id: true, fullName: true } },
        _count: { select: { enrollments: true, subjects: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok({ classes });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: school_admin membuat kelas baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const body = await req.json();
    const { name, academicYearId, homeroomTeacherId, capacity } = body || {};
    if (!name || !academicYearId) return err("Nama kelas dan tahun ajaran wajib diisi.", 400);
    const dup = await db.class.findFirst({
      where: { schoolId: ctx.schoolId!, academicYearId, name },
    });
    if (dup) return err("Kelas dengan nama ini sudah ada.", 409);
    const cls = await db.class.create({
      data: {
        schoolId: ctx.schoolId!,
        academicYearId,
        name,
        homeroomTeacherId: homeroomTeacherId || null,
        capacity: capacity || 40,
      },
    });
    await audit(ctx, "CREATE_CLASS", "Class", cls.id, { name });
    return ok({ class: cls }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
