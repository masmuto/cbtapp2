"use client";

import { create } from "zustand";

// Global app store: route state untuk SPA + data user yang aktif
type Role = "superadmin" | "school_admin" | "teacher" | "proctor" | "student";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  memberships: Array<{
    schoolId: string;
    role: Role;
    schoolName: string;
    schoolCode: string;
    schoolLevel: string;
    timezone: string;
  }>;
  activeSchoolId?: string;
  activeRole?: Role;
}

interface AppState {
  user: SessionUser | null;
  loadingUser: boolean;
  // Navigasi SPA
  view: string; // e.g. "admin.dashboard", "teacher.exams", "student.exam-runner"
  viewParams: Record<string, any>;
  setUser: (u: SessionUser | null) => void;
  setLoadingUser: (b: boolean) => void;
  navigate: (view: string, params?: Record<string, any>) => void;
  refresh: number;
  triggerRefresh: () => void;
}

export const useApp = create<AppState>((set) => ({
  user: null,
  loadingUser: true,
  view: "dashboard",
  viewParams: {},
  refresh: 0,
  setUser: (u) => set({ user: u }),
  setLoadingUser: (b) => set({ loadingUser: b }),
  navigate: (view, params = {}) => set({ view, viewParams: params }),
  triggerRefresh: () => set((s) => ({ refresh: s.refresh + 1 })),
}));

// Helper hooks
export const useRole = () => useApp((s) => s.user?.activeRole ?? (s.user?.isSuperadmin ? "superadmin" : null));
