"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { StatCard } from "@/components/cbt/shared/stat-card";
import { PageHeader } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, FileText, ClipboardList, Activity, ScrollText } from "lucide-react";
import { ROLE_LABEL, formatDateID } from "@/lib/helpers";

interface Stats {
  schools?: number;
  users?: number;
  exams?: number;
  attempts?: number;
  teachers?: number;
  students?: number;
  classes?: number;
  subjects?: number;
  activeExams?: number;
  publishedExams?: number;
  inProgressAttempts?: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/stats"),
      apiFetch("/api/audit?limit=10"),
    ]).then(([s, l]) => {
      if (s.ok) setStats(s.data?.stats);
      if (l.ok) setRecentLogs(l.data?.logs || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isSuperadmin = !stats?.teachers && stats?.schools !== undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={
          isSuperadmin
            ? "Ringkasan platform lintas sekolah"
            : "Ringkasan aktivitas sekolah aktif Anda"
        }
      />

      {isSuperadmin ? (
        // Superadmin: platform-wide
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard label="Sekolah Aktif" value={stats?.schools ?? 0} icon={Building2} accent="primary" />
            <StatCard label="Total Pengguna" value={stats?.users ?? 0} icon={Users} accent="accent" />
            <StatCard label="Total Ujian" value={stats?.exams ?? 0} icon={FileText} accent="success" />
            <StatCard label="Total Attempt" value={stats?.attempts ?? 0} icon={ClipboardList} accent="warning" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" /> Aktivitas Terbaru Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {log.action.replace(/_/g, " ")}
                          {log.targetType && <span className="text-muted-foreground"> · {log.targetType}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.actor?.fullName || "System"} · {log.school?.name || "—"} · {formatDateID(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // School admin: scoped stats
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard label="Guru" value={stats?.teachers ?? 0} icon={Users} accent="primary" hint="guru aktif" />
            <StatCard label="Siswa" value={stats?.students ?? 0} icon={Users} accent="accent" hint="siswa aktif" />
            <StatCard label="Kelas" value={stats?.classes ?? 0} icon={Building2} accent="success" />
            <StatCard label="Mata Pelajaran" value={stats?.subjects ?? 0} icon={FileText} accent="warning" />
            <StatCard label="Total Ujian" value={stats?.exams ?? 0} icon={FileText} accent="primary" />
            <StatCard label="Ujian Diterbitkan" value={stats?.activeExams ?? 0} icon={ClipboardList} accent="success" hint="siap dikerjakan" />
            <StatCard label="Attempt Aktif" value={stats?.inProgressAttempts ?? 0} icon={Activity} accent="warning" hint="sedang berjalan" />
            <StatCard label="Hasil Dipublikasi" value={stats?.publishedExams ?? 0} icon={ScrollText} accent="accent" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" /> Aktivitas Terbaru Sekolah
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada aktivitas.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 text-sm border border-border/40">
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {log.action.replace(/_/g, " ")}
                          {log.targetType && <span className="text-muted-foreground"> · {log.targetType}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {log.actor?.fullName || "System"} · {formatDateID(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
