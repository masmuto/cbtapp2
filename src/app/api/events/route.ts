import { db } from "@/lib/db";
import { getSessionContext, requireRole } from "@/lib/rbac";
import { ok, err, handleAuthError } from "@/lib/api";

// POST: catat event selama ujian (heartbeat, tab switch, fullscreen exit, focus loss, camera denied, dll)
// Body: { attemptId, type, severity?, payload? }
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("student");
    const body = await req.json();
    const { attemptId, type, severity, payload } = body || {};
    if (!attemptId || !type) return err("attemptId dan type wajib diisi.", 400);

    // Verifikasi attempt milik siswa
    const attempt = await db.examAttempt.findUnique({
      where: { id: attemptId },
      include: { enrollment: { select: { studentId: true } } },
    });
    if (!attempt) return err("Sesi ujian tidak ditemukan.", 404);
    if (attempt.enrollment.studentId !== ctx.userId) return err("Akses ditolak.", 403);

    const allowedTypes = [
      "TAB_SWITCH", "FULLSCREEN_EXIT", "FOCUS_LOSS", "HEARTBEAT",
      "CAMERA_DENIED", "CAMERA_GRANTED", "ANSWER_QUEUED",
    ];
    if (!allowedTypes.includes(type)) return err("Tipe event tidak valid.", 400);

    // Update incident count jika event kritis
    const criticalTypes = ["TAB_SWITCH", "FULLSCREEN_EXIT", "FOCUS_LOSS"];
    if (criticalTypes.includes(type)) {
      await db.examAttempt.update({
        where: { id: attemptId },
        data: { incidentCount: { increment: 1 } },
      });
    }

    const event = await db.examEvent.create({
      data: {
        attemptId,
        type,
        severity: severity || (criticalTypes.includes(type) ? "warning" : "info"),
        payload: payload ? JSON.stringify(payload) : null,
      },
    });

    return ok({ event }, 201);
  } catch (e) {
    return handleAuthError(e);
  }
}
