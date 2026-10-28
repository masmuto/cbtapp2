"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { StatCard } from "@/components/cbt/shared/stat-card";
import { PageHeader } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookCopy, FileText, Award, ClipboardList, Plus, FileCheck2 } from "lucide-react";
import { useApp } from "@/stores/app-store";
import { formatDateID } from "@/lib/helpers";

export function TeacherDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { navigate } = useApp();

  useEffect(() => {
    Promise.all([
      apiFetch("/api/stats"),
      apiFetch("/api/exams"),
    ]).then(([s, e]) => {
      if (s.ok) setStats(s.data?.stats);
      if (e.ok) setRecentExams((e.data?.exams || []).slice(0, 5));
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard Guru"
        description="Kelola bank soal, susun ujian, dan koreksi hasil"
        action={
          <Button onClick={() => navigate("question-banks")} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Bank Soal Baru
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Bank Soal" value={stats?.questionBanks ?? 0} icon={BookCopy} accent="primary" />
        <StatCard label="Total Soal" value={stats?.questions ?? 0} icon={FileText} accent="accent" />
        <StatCard label="Ujian Dibuat" value={stats?.exams ?? 0} icon={ClipboardList} accent="success" />
        <StatCard label="Perlu Koreksi" value={stats?.needsGrading ?? 0} icon={Award} accent="warning" hint="esai menunggu" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ujian Terbaru</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("exams")}>Lihat semua</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentExams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada ujian.</p>
            ) : (
              <div className="space-y-2">
                {recentExams.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-md border border-border/50 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.subject?.name} · {e._count?.examQuestions || 0} soal · {formatDateID(e.createdAt)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate("exams.builder", { examId: e.id })}>
                      Kelola
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="w-4 h-4 text-primary" /> Aksi Cepat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("question-banks")}>
              <BookCopy className="w-4 h-4 mr-2" /> Buat / Kelola Bank Soal
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("exams")}>
              <FileText className="w-4 h-4 mr-2" /> Susun Ujian Baru
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("grading")}>
              <Award className="w-4 h-4 mr-2" /> Koreksi Esai ({stats?.needsGrading ?? 0})
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("results")}>
              <ClipboardList className="w-4 h-4 mr-2" /> Lihat Hasil & Publikasi
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
