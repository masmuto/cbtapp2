import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSessionContext, requireRole, audit } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";
import * as XLSX from "xlsx";
import mammoth from "mammoth";

// =============================================================
// IMPORT SOAL DARI EXCEL (.xlsx/.xls/.csv) ATAU WORD (.docx)
// =============================================================
//
// Format kolom yang diharapkan (case-insensitive, urutan bebas):
//   type         : MULTIPLE_CHOICE | MULTIPLE_RESPONSE | TRUE_FALSE | SHORT_ANSWER | ESSAY
//   stem         : teks pertanyaan (wajib)
//   points       : angka (default 1)
//   difficulty   : EASY | MEDIUM | HARD (default MEDIUM)
//   category     : teks bebas (opsional)
//   optionA      : teks opsi A
//   optionB      : teks opsi B
//   optionC      : teks opsi C (opsional untuk TRUE_FALSE)
//   optionD      : teks opsi D (opsional)
//   optionE      : teks opsi E (opsional)
//   correctAnswer: kode opsi yang benar, mis. "B" atau "A,C,D" untuk multi-response,
//                  atau teks jawaban untuk SHORT_ANSWER
//   explanation  : penjelasan (opsional)
//
// Aturan validasi per tipe:
//   MULTIPLE_CHOICE / MULTIPLE_RESPONSE:
//     - Minimal 2 opsi terisi (A & B)
//     - correctAnswer wajib, format "B" atau "A,C" (multi-response)
//     - Setiap kode di correctAnswer harus ada di opsi yang terisi
//   TRUE_FALSE:
//     - Jika optionA/B kosong, otomatis diset "Benar"/"Salah"
//     - correctAnswer wajib "A" atau "B"
//   SHORT_ANSWER:
//     - correctAnswer wajib (teks jawaban)
//   ESSAY:
//     - Tidak perlu opsi & correctAnswer
//
// Untuk Word (.docx), format dokumen:
//   Setiap soal dipisahkan baris kosong, dengan format:
//   [MULTIPLE_CHOICE]
//   Pertanyaan...
//   A. opsi A
//   B. opsi B
//   C. opsi C
//   D. opsi D
//   ANSWER: B
//   POINTS: 1
//   DIFFICULTY: EASY
//   CATEGORY: Aljabar
//   EXPLANATION: ...
//

interface ParsedQuestion {
  rowIndex: number;
  type: string;
  stem: string;
  points: number;
  difficulty: string;
  category?: string;
  options: { code: string; text: string; isCorrect: boolean }[];
  explanation?: string;
  errors: string[];
}

const VALID_TYPES = ["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"];
const VALID_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];

function normalizeType(t: any): string {
  if (!t) return "";
  const s = String(t).trim().toUpperCase().replace(/\s+/g, "_");
  if (s === "PG" || s === "MC" || s === "PILIHAN_GANDA") return "MULTIPLE_CHOICE";
  if (s === "PGK" || s === "MCQ" || s === "MULTIPLE_ANSWER") return "MULTIPLE_RESPONSE";
  if (s === "BS" || s === "B/S" || s === "TF") return "TRUE_FALSE";
  if (s === "ISIAN" || s === "SHORT") return "SHORT_ANSWER";
  if (s === "ESA" || s === "ESAI") return "ESSAY";
  return s;
}

function normalizeDifficulty(d: any): string {
  if (!d) return "MEDIUM";
  const s = String(d).trim().toUpperCase();
  if (s === "MUDAH" || s === "GAMPANG") return "EASY";
  if (s === "SEDANG" || s === "MEDIUM" || s === "NORMAL") return "MEDIUM";
  if (s === "SULIT" || s === "SUSAH" || s === "HARD" || s === "DIFFICULT") return "HARD";
  return VALID_DIFFICULTIES.includes(s) ? s : "MEDIUM";
}

function parseRow(row: any, rowIndex: number): ParsedQuestion {
  const errors: string[] = [];
  const get = (...keys: string[]) => {
    for (const k of keys) {
      for (const rk of Object.keys(row)) {
        if (rk.toLowerCase().trim() === k.toLowerCase().trim()) {
          const v = row[rk];
          return v == null ? "" : String(v).trim();
        }
      }
    }
    return "";
  };

  const type = normalizeType(get("type", "tipe", "jenis"));
  const stem = get("stem", "question", "pertanyaan", "soal");
  const pointsRaw = get("points", "poin", "bobot");
  const points = pointsRaw ? parseFloat(pointsRaw) || 1 : 1;
  const difficulty = normalizeDifficulty(get("difficulty", "kesulitan", "level"));
  const category = get("category", "kategori", "topik");
  const explanation = get("explanation", "penjelasan", "pembahasan");
  const correctAnswer = get("correctAnswer", "answer", "jawaban", "kunci");

  const optionA = get("optionA", "opsiA", "a", "pilihanA");
  const optionB = get("optionB", "opsiB", "b", "pilihanB");
  const optionC = get("optionC", "opsiC", "c", "pilihanC");
  const optionD = get("optionD", "opsiD", "d", "pilihanD");
  const optionE = get("optionE", "opsiE", "e", "pilihanE");

  if (!type) errors.push("Tipe soal kosong");
  else if (!VALID_TYPES.includes(type)) errors.push(`Tipe soal tidak valid: ${type}`);

  if (!stem) errors.push("Stem (pertanyaan) kosong");

  const options: { code: string; text: string; isCorrect: boolean }[] = [];
  const rawOptions = [
    { code: "A", text: optionA },
    { code: "B", text: optionB },
    { code: "C", text: optionC },
    { code: "D", text: optionD },
    { code: "E", text: optionE },
  ].filter((o) => o.text);

  if (type === "MULTIPLE_CHOICE" || type === "MULTIPLE_RESPONSE") {
    if (rawOptions.length < 2) errors.push("Minimal 2 opsi terisi");
    if (!correctAnswer) errors.push("correctAnswer wajib diisi");
    else {
      const correctCodes = correctAnswer.split(/[,;]/).map((c) => c.trim().toUpperCase());
      for (const cc of correctCodes) {
        if (!rawOptions.find((o) => o.code === cc)) {
          errors.push(`Kode jawaban '${cc}' tidak ada di opsi`);
        }
      }
      for (const o of rawOptions) {
        options.push({ code: o.code, text: o.text, isCorrect: correctCodes.includes(o.code) });
      }
      if (type === "MULTIPLE_CHOICE" && correctCodes.length > 1) {
        errors.push("MULTIPLE_CHOICE hanya boleh 1 jawaban benar. Gunakan MULTIPLE_RESPONSE untuk multiple.");
      }
      if (type === "MULTIPLE_RESPONSE" && correctCodes.length < 2) {
        errors.push("MULTIPLE_RESPONSE butuh minimal 2 jawaban benar");
      }
      if (!options.some((o) => o.isCorrect)) errors.push("Tidak ada opsi yang benar");
    }
  } else if (type === "TRUE_FALSE") {
    const opts = [
      { code: "A", text: optionA || "Benar" },
      { code: "B", text: optionB || "Salah" },
    ];
    if (!correctAnswer) errors.push("correctAnswer wajib (A=Benar / B=Salah)");
    else {
      const ca = correctAnswer.toUpperCase().trim();
      const correctCode = ca === "A" || ca === "BENAR" || ca === "TRUE" || ca === "1" ? "A" :
                          ca === "B" || ca === "SALAH" || ca === "FALSE" || ca === "0" ? "B" : "";
      if (!correctCode) errors.push(`correctAnswer tidak valid: ${correctAnswer}`);
      for (const o of opts) {
        options.push({ code: o.code, text: o.text, isCorrect: o.code === correctCode });
      }
    }
  } else if (type === "SHORT_ANSWER") {
    if (!correctAnswer) errors.push("correctAnswer wajib (kunci jawaban teks)");
    else {
      options.push({ code: "KUNCI", text: correctAnswer, isCorrect: true });
    }
  }

  return {
    rowIndex,
    type: type || "MULTIPLE_CHOICE",
    stem,
    points,
    difficulty,
    category: category || undefined,
    explanation: explanation || undefined,
    options,
    errors,
  };
}

function parseExcelOrCsv(buffer: ArrayBuffer): ParsedQuestion[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Sheet tidak ditemukan");
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) throw new Error("File kosong atau tidak ada baris data");
  return rows.map((r, i) => parseRow(r, i + 2));
}

async function parseDocx(buffer: ArrayBuffer): Promise<ParsedQuestion[]> {
  // mammoth memerlukan { buffer: Buffer } (Node), bukan arrayBuffer
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  const text = result.value;
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const questions: ParsedQuestion[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const obj: any = {};
    const opts: { code: string; text: string }[] = [];
    const stemBuffer: string[] = [];

    for (const line of lines) {
      const typeMatch = line.match(/^\[(MULTIPLE_CHOICE|MULTIPLE_RESPONSE|TRUE_FALSE|SHORT_ANSWER|ESSAY|PG|PGK|BS|ISIAN|ESA|ESAI)\]/i);
      if (typeMatch) {
        obj.type = typeMatch[1];
        const rest = line.replace(/^\[[^\]]+\]/, "").trim();
        if (rest) stemBuffer.push(rest);
        continue;
      }
      const optMatch = line.match(/^([A-E])[.)]\s+(.+)$/i);
      if (optMatch) {
        opts.push({ code: optMatch[1].toUpperCase(), text: optMatch[2].trim() });
        continue;
      }
      const kvMatch = line.match(/^(ANSWER|JAWABAN|KUNCI|POINTS|POIN|DIFFICULTY|KESULITAN|CATEGORY|KATEGORI|TOPIK|EXPLANATION|PENJELASAN|PEMBAHASAN)\s*[:\-]\s*(.+)$/i);
      if (kvMatch) {
        const key = kvMatch[1].toUpperCase();
        const val = kvMatch[2].trim();
        if (key === "ANSWER" || key === "JAWABAN" || key === "KUNCI") obj.correctAnswer = val;
        else if (key === "POINTS" || key === "POIN") obj.points = val;
        else if (key === "DIFFICULTY" || key === "KESULITAN") obj.difficulty = val;
        else if (key === "CATEGORY" || key === "KATEGORI" || key === "TOPIK") obj.category = val;
        else if (key === "EXPLANATION" || key === "PENJELASAN" || key === "PEMBAHASAN") obj.explanation = val;
        continue;
      }
      stemBuffer.push(line);
    }

    obj.stem = stemBuffer.join(" ").trim();
    if (opts.length > 0) {
      opts.forEach((o) => {
        obj[`option${o.code}`] = o.text;
      });
    }

    const parsed = parseRow(obj, i + 1);
    questions.push(parsed);
  }
  return questions;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole("teacher", "school_admin");
    const formData = await req.formData();
    const bankId = formData.get("bankId") as string;
    const file = formData.get("file") as File;

    if (!bankId) return err("bankId wajib diisi.", 400);
    if (!file) return err("File wajib diupload.", 400);

    const bank = await db.questionBank.findFirst({ where: { id: bankId, schoolId: ctx.schoolId } });
    if (!bank) return err("Bank soal tidak ditemukan.", 404);
    if (ctx.role === "teacher" && bank.ownerId !== ctx.userId)
      return err("Anda bukan pemilik bank soal ini.", 403);

    const fileName = (file.name || "").toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isCsv = fileName.endsWith(".csv");
    const isDocx = fileName.endsWith(".docx");
    if (!isExcel && !isCsv && !isDocx) {
      return err("Format file tidak didukung. Gunakan .xlsx, .xls, .csv, atau .docx", 400);
    }

    if (file.size > 5 * 1024 * 1024) {
      return err("Ukuran file maksimal 5MB.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();

    let parsed: ParsedQuestion[];
    try {
      if (isExcel || isCsv) {
        parsed = parseExcelOrCsv(arrayBuffer);
      } else {
        parsed = await parseDocx(arrayBuffer);
      }
    } catch (e: any) {
      return err(`Gagal parsing file: ${e.message || e}`, 400);
    }

    if (parsed.length === 0) {
      return err("Tidak ada soal yang bisa diimpor dari file.", 400);
    }

    const valid = parsed.filter((q) => q.errors.length === 0);
    const invalid = parsed.filter((q) => q.errors.length > 0);

    let createdCount = 0;
    const createdIds: string[] = [];
    if (valid.length > 0) {
      await db.$transaction(async (tx) => {
        for (const q of valid) {
          const created = await tx.question.create({
            data: {
              questionBankId: bankId,
              type: q.type,
              stem: q.stem,
              difficulty: q.difficulty,
              category: q.category || null,
              tags: null,
              points: q.points,
              explanation: q.explanation || null,
              options: q.options.length > 0 ? {
                create: q.options.map((o, idx) => ({
                  code: o.code,
                  text: o.text,
                  isCorrect: o.isCorrect,
                  orderIndex: idx,
                })),
              } : undefined,
            },
          });
          createdIds.push(created.id);
          createdCount++;
        }
      });
    }

    await audit(ctx, "IMPORT_QUESTIONS", "QuestionBank", bankId, {
      fileName: file.name,
      fileSize: file.size,
      total: parsed.length,
      valid: valid.length,
      invalid: invalid.length,
    });

    return ok({
      success: true,
      total: parsed.length,
      created: createdCount,
      skipped: invalid.length,
      errors: invalid.map((q) => ({
        row: q.rowIndex,
        stem: q.stem.slice(0, 60),
        errors: q.errors,
      })),
      createdIds,
    }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
