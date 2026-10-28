import { db } from "@/lib/db";
import { getSessionContext, audit, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// Helper: validasi kepemilikan bank soal
async function assertBankOwned(bankId: string, ctx: any) {
  const bank = await db.questionBank.findFirst({
    where: { id: bankId, schoolId: ctx.schoolId },
  });
  if (!bank) throw new Error("NOT_FOUND");
  if (ctx.role === "teacher" && bank.ownerId !== ctx.userId)
    throw new Error("FORBIDDEN_NOT_OWNER");
  return bank;
}

// GET: daftar soal di bank ?bankId=
export async function GET(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get("bankId");
    if (!bankId) return err("bankId wajib diisi.", 400);
    await assertBankOwned(bankId, ctx);
    const questions = await db.question.findMany({
      where: { questionBankId: bankId },
      include: { options: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ questions });
  } catch (e) {
    return handleAuthError(e);
  }
}

// POST: guru menambah soal ke bank
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const body = await req.json();
    const { bankId, type, stem, difficulty, category, tags, points, explanation, options } = body || {};
    if (!bankId || !type || !stem) return err("bankId, type, dan stem wajib diisi.", 400);
    if (!["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"].includes(type))
      return err("Tipe soal tidak valid.", 400);
    await assertBankOwned(bankId, ctx);

    // Validasi minimal: pilihan ganda butuh >= 2 opsi dengan >= 1 benar
    if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE" || type === "TRUE_FALSE") {
      if (!options || !Array.isArray(options) || options.length < 2)
        return err("Soal pilihan ganda butuh minimal 2 opsi.", 400);
      if (!options.some((o: any) => o.isCorrect))
        return err("Wajib ada minimal 1 opsi yang benar.", 400);
    }

    const question = await db.question.create({
      data: {
        questionBankId: bankId,
        type,
        stem,
        difficulty: difficulty || "MEDIUM",
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        points: points ?? 1,
        explanation: explanation || null,
        options: options && options.length > 0 ? {
          create: options.map((o: any, idx: number) => ({
            code: o.code,
            text: o.text,
            isCorrect: !!o.isCorrect,
            orderIndex: idx,
          })),
        } : undefined,
      },
      include: { options: true },
    });
    await audit(ctx, "CREATE_QUESTION", "Question", question.id, { bankId, type });
    return ok({ question }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
