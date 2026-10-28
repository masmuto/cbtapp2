import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// Translate error dari RBAC ke response HTTP
export function handleAuthError(e: unknown) {
  const msg = e instanceof Error ? e.message : "UNKNOWN";
  switch (msg) {
    case "UNAUTHORIZED":
      return err("Tidak terautentikasi.", 401);
    case "FORBIDDEN":
      return err("Anda tidak memiliki kewenangan untuk aksi ini.", 403);
    case "FORBIDDEN_CROSS_SCHOOL":
      return err("Akses lintas sekolah ditolak.", 403);
    case "FORBIDDEN_NOT_OWNER":
      return err("Anda bukan pemilik sumber daya ini.", 403);
    case "FORBIDDEN_NOT_ASSIGNED":
      return err("Anda tidak ditugaskan pada ujian ini.", 403);
    case "NO_ACTIVE_SCHOOL":
      return err("Tidak ada sekolah aktif pada sesi.", 400);
    case "NOT_FOUND":
      return err("Sumber daya tidak ditemukan.", 404);
    default:
      console.error("[handleAuthError] unhandled:", e);
      return err("Kesalahan internal server.", 500);
  }
}

export function parseJSON<T = any>(body: string): T {
  return JSON.parse(body) as T;
}
