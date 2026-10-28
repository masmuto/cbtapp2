"use client";

import { useApp, useRole } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/helpers";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, FileText,
  ClipboardList, ShieldAlert, ScrollText, School, Settings,
  LogOut, Bell, User, Menu, X, ChevronRight, BookCopy, ClipboardCheck,
  Award, Eye, FileCheck2, CalendarClock, Building2, BarChart3, ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { signOut } from "next-auth/react";

type NavItem = {
  view: string;
  label: string;
  icon: any;
};

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  superadmin: [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "schools", label: "Sekolah", icon: Building2 },
    { view: "audit", label: "Audit Log", icon: ScrollText },
  ],
  school_admin: [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "academic-years", label: "Tahun Ajaran", icon: CalendarClock },
    { view: "classes", label: "Kelas", icon: School },
    { view: "subjects", label: "Mata Pelajaran", icon: BookOpen },
    { view: "teachers", label: "Guru", icon: GraduationCap },
    { view: "students", label: "Siswa", icon: Users },
    { view: "exams", label: "Ujian", icon: FileText },
    { view: "monitoring", label: "Monitoring", icon: ClipboardCheck },
    { view: "audit", label: "Audit Log", icon: ScrollText },
  ],
  teacher: [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "question-banks", label: "Bank Soal", icon: BookCopy },
    { view: "exams", label: "Ujian", icon: FileText },
    { view: "monitoring", label: "Monitoring", icon: Eye },
    { view: "grading", label: "Koreksi", icon: ClipboardList },
    { view: "results", label: "Hasil & Nilai", icon: Award },
  ],
  proctor: [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "monitoring", label: "Monitoring", icon: Eye },
  ],
  student: [
    { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { view: "exams", label: "Ujian Saya", icon: FileText },
    { view: "results", label: "Nilai Saya", icon: Award },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, navigate } = useApp();
  const role = useRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return <>{children}</>;
  const navItems = NAV_BY_ROLE[role || "student"] || [];

  const handleNav = (v: string) => {
    navigate(v);
    setSidebarOpen(false);
  };

  const initials = user.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-sidebar-foreground truncate">CBT Sekolah</p>
            <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">Platform Ujian</p>
          </div>
        </div>

        {/* School Context */}
        {user.memberships[0] && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider mb-1">Sekolah Aktif</p>
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user.memberships[0].schoolName}
            </p>
            <Badge variant="secondary" className="mt-1.5 text-[10px] uppercase">
              {ROLE_LABEL[role || ""]}
            </Badge>
          </div>
        )}

        {/* Nav */}
        <nav className="px-3 py-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-13rem)] scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.view || view.startsWith(`${item.view}.`);
            return (
              <button
                key={item.view}
                onClick={() => handleNav(item.view)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-sidebar-accent",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/80"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Footer / Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={async () => {
                // Gunakan redirect:false agar NextAuth tidak membawa user ke URL absolute
                // (localhost:3000), yang tidak bisa diakses dari preview link.
                // Setelah signOut di client, reload halaman untuk reset SPA state.
                await signOut({ redirect: false });
                window.location.reload();
              }}
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-sm font-semibold capitalize">
                  {navItems.find((n) => view.startsWith(n.view))?.label || view}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">{children}</main>

        {/* Bottom Navigation Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t">
          <div className="grid grid-cols-5">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = view === item.view || view.startsWith(`${item.view}.`);
              return (
                <button
                  key={item.view}
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="truncate max-w-full px-1">{item.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
