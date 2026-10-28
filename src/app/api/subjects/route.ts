import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar mata pelajaran di sekolah aktif
export async function GET() {
  try {
    const ctx = await requireRole("school_admin", "teacher", "proctor", "student");
    const subjects = await db.subject.findMany({
      where: { schoolId: ctx.schoolId },
      orderBy: { name: "asc" },
    });
    return ok({ subjects });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: school_admin membuat mapel baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("school_admin");
    const body = await req.json();
    const { code, name, level } = body || {};
    if (!code || !name) return err("Kode dan nama mapel wajib diisi.", 400);
    const dup = await db.subject.findFirst({ where: { schoolId: ctx.schoolId!, code } });
    if (dup) return err("Kode mapel sudah dipakai.", 409);
    const subject = await db.subject.create({
      data: { schoolId: ctx.schoolId!, code, name, level },
    });
    await audit(ctx, "CREATE_SUBJECT", "Subject", subject.id, { code, name });
    return ok({ subject }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
