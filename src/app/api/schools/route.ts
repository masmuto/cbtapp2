import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";
import { hashPassword } from "@/lib/helpers";

// GET: daftar semua sekolah (superadmin) atau sekolah aktif user biasa
export async function GET() {
  try {
    const ctx = await getSessionContext();
    if (!ctx) return ok({ schools: [] }, 200);
    if (ctx.isSuperadmin) {
      const schools = await db.school.findMany({ orderBy: { name: "asc" } });
      return ok({ schools });
    }
    // user biasa: kembalikan sekolah dari keanggotaannya
    const memberships = await db.schoolMembership.findMany({
      where: { userId: ctx.userId, status: "active" },
      include: { school: true },
    });
    return ok({ schools: memberships.map((m) => m.school) });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: superadmin membuat sekolah baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("superadmin");
    const body = await req.json();
    const { code, name, level, address, city, province, timezone } = body || {};
    if (!code || !name || !level) return err("Kode, nama, dan jenjang wajib diisi.", 400);
    const exists = await db.school.findFirst({ where: { OR: [{ code }, { name }] } });
    if (exists) return err("Kode atau nama sekolah sudah dipakai.", 409);
    const school = await db.school.create({
      data: { code, name, level, address, city, province, timezone: timezone || "Asia/Jakarta" },
    });
    await audit(ctx, "CREATE_SCHOOL", "School", school.id, { code, name });
    return ok({ school }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
