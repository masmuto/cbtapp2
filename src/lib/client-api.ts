"use client";

// Fetch helper yang otomatis menyertakan credentials dan parse JSON.
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      credentials: "include",
    });
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await res.json() : null;
    if (!res.ok) {
      return { ok: false, status: res.status, data: null, error: body?.error || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data: body as T, error: null };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: e instanceof Error ? e.message : "Kesalahan jaringan",
    };
  }
}
