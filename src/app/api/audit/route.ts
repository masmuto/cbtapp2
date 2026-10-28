import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar audit log (superadmin: semua, school_admin: sekolahnya)
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("superadmin", "school_admin");
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    const where = ctx.isSuperadmin ? {} : { schoolId: ctx.schoolId };
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
          school: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);
    return ok({ logs, total, limit, offset });
  } catch (e) {
    return handleAuthError(e);
  }
}
