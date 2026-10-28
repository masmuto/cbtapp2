import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";
import { hashPassword } from "@/lib/helpers";

// GET: daftar guru di sekolah aktif
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const memberships = await db.schoolMembership.findMany({
      where: { schoolId: ctx.schoolId, role: "teacher", status: "active" },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, username: true, phone: true, isActive: true,
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });
    // Hitung jumlah classSubjects per guru
    const teacherIds = memberships.map((m) => m.userId);
    const counts = await db.classSubject.groupBy({
      by: ["teacherId"],
      where: { teacherId: { in: teacherIds } },
      _count: true,
    });
    const countMap = new Map(counts.map((c) => [c.teacherId, c._count]));
    const teachers = memberships.map((m) => ({
      id: m.user.id,
      fullName: m.user.fullName,
      email: m.user.email,
      username: m.user.username,
      phone: m.user.phone,
      isActive: m.user.isActive,
      assignmentCount: countMap.get(m.userId) ?? 0,
      membershipId: m.id,
    }));
    return ok({ teachers });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: school_admin menambahkan guru baru (auto buat user + membership teacher)
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const body = await req.json();
    const { fullName, email, username, phone, password } = body || {};
    if (!fullName || !email || !username || !password)
      return err("Nama, email, username, dan password wajib diisi.", 400);
    const dup = await db.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (dup) return err("Email atau username sudah terdaftar.", 409);
    const user = await db.user.create({
      data: {
        fullName, email, username, phone,
        passwordHash: await hashPassword(password),
        isActive: true,
        memberships: { create: [{ schoolId: ctx.schoolId!, role: "teacher" }] },
      },
    });
    await audit(ctx, "CREATE_TEACHER", "User", user.id, { fullName, email });
    return ok({ user: { id: user.id, fullName: user.fullName, email: user.email } }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
