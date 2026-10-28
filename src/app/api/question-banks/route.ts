import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// GET: daftar bank soal di sekolah aktif. Guru melihat bank miliknya sendiri + bank milik sekolah.
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("school_admin", "teacher");
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");
    const where: any = { schoolId: ctx.schoolId };
    if (subjectId) where.subjectId = subjectId;
    if (ctx.role === "teacher") where.ownerId = ctx.userId;
    const banks = await db.questionBank.findMany({
      where,
      include: {
        subject: { select: { id: true, name: true, code: true } },
        owner: { select: { id: true, fullName: true } },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ banks });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: guru membuat bank soal baru
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const body = await req.json();
    const { name, description, subjectId } = body || {};
    if (!name || !subjectId) return err("Nama bank dan mapel wajib diisi.", 400);
    const subject = await db.subject.findFirst({ where: { id: subjectId, schoolId: ctx.schoolId } });
    if (!subject) return err("Mapel tidak ditemukan.", 404);
    const bank = await db.questionBank.create({
      data: {
        schoolId: ctx.schoolId!,
        subjectId,
        ownerId: ctx.userId,
        name,
        description,
      },
    });
    await audit(ctx, "CREATE_QUESTION_BANK", "QuestionBank", bank.id, { name, subjectId });
    return ok({ bank }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
