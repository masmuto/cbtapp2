"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/cbt/shared/common";
import { StatCard } from "@/components/cbt/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Activity, Eye, Users, AlertTriangle, Clock, Wifi, WifiOff,
  CheckCircle2, Search, RefreshCw, ChevronRight, Radio,
  TrendingUp, FileText, ShieldAlert, Timer, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ATTEMPT_STATUS_LABEL, formatDateID } from "@/lib/helpers";
import { TeacherLiveDetail } from "@/components/cbt/teacher/teacher-live-detail";

interface LiveAttempt {
  id: string;
  examId: string;
  status: string;
  attemptNo: number;
  startedAt: string | null;
  serverEndsAt: string | null;
  submittedAt: string | null;
  finalScore: number | null;
  isPassed: boolean | null;
  incidentCount: number;
  totalEvents: number;
  isOnline: boolean;
  lastActivityAt: string | null;
  lastSyncAt: string | null;
  remainingSec: number | null;
  elapsedSec: number;
  durationSec: number;
  progressPct: number;
  answeredCount: number;
  totalQuestions: number;
  student: { id: string; fullName: string; email: string };
  class: { name: string };
  recentEvents: any[];
  incidents: number;
}

interface Stats {
  total: number;
  active: number;
  online: number;
  submitted: number;
  graded: number;
  incidents: number;
  withIncidents: number;
  avgProgress: number;
}

export function TeacherMonitoring() {
  const [attempts, setAttempts] = useState<LiveAttempt[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("__all__");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    const query = examFilter !== "__all__" ? `?examId=${examFilter}` : "";
    const r = await apiFetch(`/api/teacher/monitoring${query}`);
    if (r.ok) {
      setAttempts(r.data?.attempts || []);
      setExams(r.data?.exams || []);
      setStats(r.data?.stats);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, [examFilter]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Auto-refresh setiap 4 detik
  useEffect(() => {
    if (!autoRefresh || activeAttemptId) return;
    const t = setInterval(fetch, 4000);
    return () => clearInterval(t);
  }, [autoRefresh, fetch, activeAttemptId]);

  // Detail view
  if (activeAttemptId) {
    return (
      <TeacherLiveDetail
        attemptId={activeAttemptId}
        onBack={() => setActiveAttemptId(null)}
      />
    );
  }

  const filtered = attempts.filter((a) => {
    const matchSearch = !search ||
      a.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.student.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "__all__" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatAgo = (iso: string | null) => {
    if (!iso) return "—";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 5) return "baru saja";
    if (diff < 60) return `${diff} dtk lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    return `${Math.floor(diff / 3600)} jam lalu`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Monitoring Ujian"
        description="Pantau siswa secara real-time saat mengerjakan ujian Anda"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Radio className={cn("w-4 h-4 mr-1", autoRefresh && "animate-pulse")} />
              {autoRefresh ? "Live" : "Paused"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetch}>
              <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard
            label="Total Sesi"
            value={stats.total}
            hint="semua attempt"
            icon={Users}
            accent="primary"
          />
          <StatCard
            label="Sedang Aktif"
            value={stats.active}
            hint={`${stats.online} online`}
            icon={Activity}
            accent="success"
          />
          <StatCard
            label="Rata-rata Progress"
            value={`${stats.avgProgress}%`}
            hint="jawaban terisi"
            icon={TrendingUp}
            accent="accent"
          />
          <StatCard
            label="Insiden"
            value={stats.incidents}
            hint={`${stats.withIncidents} siswa`}
            icon={AlertTriangle}
            accent="warning"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={examFilter} onValueChange={setExamFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Semua ujian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Ujian</SelectItem>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Semua Status</SelectItem>
                <SelectItem value="in_progress">Sedang Berjalan</SelectItem>
                <SelectItem value="submitted">Dikumpulkan</SelectItem>
                <SelectItem value="graded">Dinilai</SelectItem>
                <SelectItem value="published">Diterbitkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              Update terakhir: {lastUpdate.toLocaleTimeString("id-ID")} · Auto-refresh {autoRefresh ? "ON" : "OFF"} (4s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Attempts grid */}
      {loading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Memuat data monitoring...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Belum ada sesi ujian"
          description="Siswa yang sedang mengerjakan ujian Anda akan muncul di sini secara real-time."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <AttemptCard
              key={a.id}
              attempt={a}
              onClick={() => setActiveAttemptId(a.id)}
              formatTime={formatTime}
              formatAgo={formatAgo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================================
// KARTU PER SISWA — info ringkas real-time
// =====================================================
function AttemptCard({
  attempt: a,
  onClick,
  formatTime,
  formatAgo,
}: {
  attempt: LiveAttempt;
  onClick: () => void;
  formatTime: (sec: number) => string;
  formatAgo: (iso: string | null) => string;
}) {
  const initials = a.student.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const isActive = a.status === "in_progress";
  const isLowTime = a.remainingSec != null && a.remainingSec < 300; // <5 menit
  const isCriticalTime = a.remainingSec != null && a.remainingSec < 60; // <1 menit

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/40",
        isActive && "border-emerald-300 bg-emerald-50/30",
        a.incidentCount > 0 && "border-amber-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: avatar + name + status */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isActive && (
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                a.isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              )} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{a.student.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {a.class.name}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        {/* Status badge + incident */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
          <StatusBadge
            status={a.status}
            label={ATTEMPT_STATUS_LABEL[a.status] || a.status}
          />
          {a.incidentCount > 0 && (
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {a.incidentCount} insiden
            </Badge>
          )}
        </div>

        {/* Progress bar */}
        {isActive && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress jawaban</span>
              <span className="font-semibold">{a.answeredCount}/{a.totalQuestions} ({a.progressPct}%)</span>
            </div>
            <Progress value={a.progressPct} className="h-2" />
          </div>
        )}

        {/* Live metrics */}
        {isActive ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Timer */}
            <div className={cn(
              "rounded-md p-2 flex items-center gap-1.5",
              isCriticalTime ? "bg-red-50 text-red-700" :
              isLowTime ? "bg-amber-50 text-amber-700" : "bg-muted"
            )}>
              <Timer className="w-3.5 h-3.5" />
              <div>
                <p className="text-[10px] opacity-70">Sisa Waktu</p>
                <p className="font-mono font-bold">
                  {a.remainingSec != null ? formatTime(a.remainingSec) : "—"}
                </p>
              </div>
            </div>
            {/* Sync status */}
            <div className={cn(
              "rounded-md p-2 flex items-center gap-1.5",
              a.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"
            )}>
              {a.isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <div className="min-w-0">
                <p className="text-[10px] opacity-70">{a.isOnline ? "Online" : "Offline"}</p>
                <p className="truncate">{formatAgo(a.lastSyncAt)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground space-y-1">
            {a.finalScore != null && (
              <div className="flex items-center justify-between">
                <span>Nilai Akhir:</span>
                <Badge variant={a.isPassed ? "default" : "secondary"} className={a.isPassed ? "bg-emerald-600" : "bg-amber-100 text-amber-700"}>
                  {a.finalScore}
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>Submit:</span>
              <span>{a.submittedAt ? formatDateID(a.submittedAt) : "—"}</span>
            </div>
          </div>
        )}

        {/* Recent events */}
        {a.recentEvents.length > 0 && isActive && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Aktivitas Terakhir</p>
            <div className="space-y-0.5">
              {a.recentEvents.slice(0, 2).map((e) => (
                <div key={e.id} className="flex items-center gap-1.5 text-xs">
                  {e.severity === "warning" ? (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  ) : e.severity === "critical" ? (
                    <ShieldAlert className="w-3 h-3 text-red-500" />
                  ) : (
                    <Zap className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground">{e.type.replace(/_/g, " ").toLowerCase()}</span>
                  <span className="text-muted-foreground/70 ml-auto">{formatAgo(e.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
