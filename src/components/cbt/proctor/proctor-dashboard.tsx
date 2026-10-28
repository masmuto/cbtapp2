"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { StatCard } from "@/components/cbt/shared/stat-card";
import { PageHeader, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eye, ClipboardList, Activity, AlertTriangle, Users } from "lucide-react";
import { useApp } from "@/stores/app-store";
import { ATTEMPT_STATUS_LABEL, formatDateID } from "@/lib/helpers";

export function ProctorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { navigate } = useApp();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/stats"),
      apiFetch("/api/proctoring"),
    ]).then(([s, a]) => {
      if (s.ok) setStats(s.data?.stats);
      if (a.ok) setAttempts(a.data?.attempts || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const activeAttempts = attempts.filter((a) => a.status === "in_progress");
  const submittedAttempts = attempts.filter((a) => ["submitted", "graded", "published"].includes(a.status));
  const flaggedAttempts = attempts.filter((a) => a.incidentCount > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Pengawas"
        description="Pantau sesi ujian yang sedang berjalan"
        action={
          <Button onClick={() => navigate("monitoring")} size="sm">
            <Eye className="w-4 h-4 mr-1" /> Buka Monitoring
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Ujian Ditugaskan" value={stats?.assignedExams ?? 0} icon={ClipboardList} accent="primary" />
        <StatCard label="Sesi Aktif" value={stats?.activeNow ?? 0} icon={Activity} accent="success" hint="sedang berjalan" />
        <StatCard label="Total Sesi" value={stats?.monitoredAttempts ?? 0} icon={Users} accent="accent" />
        <StatCard label="Insiden" value={stats?.incidents ?? 0} icon={AlertTriangle} accent="warning" hint="perlu ditinjau" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-emerald-600 animate-soft-pulse" /> Sesi Aktif ({activeAttempts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada sesi aktif saat ini.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {activeAttempts.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-border/50 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{a.student.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.exam.title} · {a.class.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{a.class.name}</p>
                      {a.incidentCount > 0 && (
                        <span className="text-xs text-amber-600 font-medium">⚠ {a.incidentCount} insiden</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Ditandai untuk Ditinjau ({flaggedAttempts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {flaggedAttempts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Tidak ada insiden yang ditandai.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
                {flaggedAttempts.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-amber-200 bg-amber-50/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{a.student.fullName}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.exam.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={a.status} label={ATTEMPT_STATUS_LABEL[a.status] || a.status} />
                      <p className="text-xs text-amber-700 mt-0.5">{a.incidentCount} insiden</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
