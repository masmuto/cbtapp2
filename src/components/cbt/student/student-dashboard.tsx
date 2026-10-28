"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { StatCard } from "@/components/cbt/shared/stat-card";
import { PageHeader, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, Award, CalendarClock, CheckCircle2, AlertCircle } from "lucide-react";
import { useApp } from "@/stores/app-store";
import { formatDateID, EXAM_STATUS_LABEL } from "@/lib/helpers";

export function StudentDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { navigate } = useApp();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/stats"),
      apiFetch("/api/exams"),
    ]).then(([s, e]) => {
      if (s.ok) setStats(s.data?.stats);
      if (e.ok) setExams(e.data?.exams || []);
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

  // Bagi exams: upcoming, available now, completed
  const now = new Date();
  const upcoming = exams.filter((e) => e.startAt && new Date(e.startAt) > now);
  const available = exams.filter((e) => {
    const startOk = !e.startAt || new Date(e.startAt) <= now;
    const endOk = !e.endAt || new Date(e.endAt) >= now;
    return startOk && endOk && (!e.myAttempt || e.myAttempt.status === "in_progress");
  });
  const completed = exams.filter((e) => e.myAttempt && ["submitted", "graded", "reviewed", "published"].includes(e.myAttempt.status));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Siswa"
        description="Lihat jadwal ujian dan kerjakan ujian yang ditugaskan"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Ujian" value={stats?.totalExams ?? 0} icon={FileText} accent="primary" />
        <StatCard label="Akan Datang" value={stats?.upcomingExams ?? 0} icon={CalendarClock} accent="warning" />
        <StatCard label="Sudah Dikerjakan" value={stats?.completedAttempts ?? 0} icon={CheckCircle2} accent="success" />
        <StatCard label="Nilai Diterbitkan" value={stats?.publishedResults ?? 0} icon={Award} accent="accent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ujian Tersedia</span>
            <Button variant="ghost" size="sm" onClick={() => navigate("exams")}>Lihat semua</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {available.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tidak ada ujian yang dapat dikerjakan saat ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {available.slice(0, 6).map((e) => (
                <Card key={e.id} className="border-border/60 hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.subject?.name} · {e.assignmentClass?.name}</p>
                      </div>
                      <StatusBadge status={e.status} label={EXAM_STATUS_LABEL[e.status] || e.status} />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                      <p>Durasi: {e.durationMinutes} menit</p>
                      <p>Soal: {e._count?.examQuestions || 0}</p>
                      {e.startAt && <p>Mulai: {formatDateID(e.startAt)}</p>}
                    </div>
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => navigate("exam-runner", { examId: e.id })}
                    >
                      {e.myAttempt?.status === "in_progress" ? "Lanjutkan Ujian" : "Mulai Ujian"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Ujian Selesai Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completed.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-sm">{e.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {e.subject?.name} · {formatDateID(e.myAttempt.submittedAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {e.myAttempt.status === "published" ? (
                      <p className="text-sm font-bold text-primary">{e.myAttempt.finalScore}</p>
                    ) : (
                      <StatusBadge status={e.myAttempt.status} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
