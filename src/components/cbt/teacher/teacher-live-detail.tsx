"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, Activity, AlertTriangle, Clock, Wifi, WifiOff,
  CheckCircle2, RefreshCw, Timer, Radio, Zap,
  ShieldAlert, Eye, FileText, TrendingUp, XCircle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ATTEMPT_STATUS_LABEL, formatDateID, QUESTION_TYPE_LABEL } from "@/lib/helpers";

interface LiveDetail {
  attempt: any;
  exam: any;
  student: any;
  class: any;
  events: any[];
  answers: any[];
  proctoring: any[];
}

export function TeacherLiveDetail({
  attemptId,
  onBack,
}: {
  attemptId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<LiveDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const r = await apiFetch(`/api/teacher/monitoring/${attemptId}`);
    if (r.ok) setData(r.data);
    setLoading(false);
  }, [attemptId]);

  useEffect(() => {
    fetch();
    // Auto-refresh setiap 3 detik untuk live updates
    const t = setInterval(fetch, 3000);
    return () => clearInterval(t);
  }, [fetch]);

  if (loading) {
    return <div className="text-center py-12 text-sm text-muted-foreground">Memuat detail...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-3">Sesi tidak ditemukan.</p>
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </Button>
      </div>
    );
  }

  const { attempt: a, exam, student, class: cls, events, answers } = data;
  const initials = student.fullName.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const isActive = a.status === "in_progress";
  const isLowTime = a.remainingSec != null && a.remainingSec < 300;
  const isCriticalTime = a.remainingSec != null && a.remainingSec < 60;

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

  // Group events by type for summary
  const eventCounts = events.reduce((acc: Record<string, number>, e: any) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});
  const incidents = events.filter((e: any) => e.severity === "warning" || e.severity === "critical");

  return (
    <div className="space-y-5">
      <PageHeader
        title={student.fullName}
        description={`${cls.name} · ${exam.title}`}
        action={
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
        }
      />

      {/* Live status bar */}
      {isActive && (
        <Card className={cn(
          "border-l-4",
          a.isOnline ? "border-l-emerald-500" : "border-l-amber-500"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  a.isOnline ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                )}>
                  <Radio className={cn("w-6 h-6", a.isOnline && "animate-pulse")} />
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {a.isOnline ? "Online" : "Offline"}
                    {a.isOnline && (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Aktif
                      </span>
                    )}
                    {!a.isOnline && (
                      <span className="text-xs text-amber-600 flex items-center gap-1">
                        <WifiOff className="w-3 h-3" /> Tidak ada heartbeat
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Aktivitas terakhir: {formatAgo(a.lastActivityAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={fetch}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <StatusBadge status={a.status} label={ATTEMPT_STATUS_LABEL[a.status]} />
            {a.finalScore != null && (
              <p className="text-2xl font-bold mt-2">{a.finalScore}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Progress</p>
            <p className="text-2xl font-bold">{a.progressPct}%</p>
            <Progress value={a.progressPct} className="h-1.5 mt-1" />
            <p className="text-xs text-muted-foreground mt-1">{a.answeredCount}/{a.totalQuestions} soal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sisa Waktu</p>
            <p className={cn(
              "text-2xl font-bold font-mono tabular-nums",
              isCriticalTime ? "text-red-600 animate-pulse" :
              isLowTime ? "text-amber-600" : ""
            )}>
              {a.remainingSec != null ? formatTime(a.remainingSec) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              dari {exam.durationMinutes} mnt
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Insiden</p>
            <p className={cn(
              "text-2xl font-bold",
              a.incidentCount > 0 ? "text-amber-600" : "text-emerald-600"
            )}>
              {a.incidentCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{a.totalEvents} total event</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline events */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Timeline Aktivitas
                </span>
                <Badge variant="secondary">{events.length} event</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas tercatat.</p>
              ) : (
                <ScrollArea className="h-96 pr-3">
                  <div className="space-y-2">
                    {events.slice(0, 100).map((e: any, idx: number) => (
                      <div
                        key={e.id}
                        className={cn(
                          "flex items-start gap-3 p-2.5 rounded-md border text-sm",
                          e.severity === "critical" ? "border-red-200 bg-red-50/50" :
                          e.severity === "warning" ? "border-amber-200 bg-amber-50/50" :
                          "border-border"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                          e.severity === "critical" ? "bg-red-100 text-red-600" :
                          e.severity === "warning" ? "bg-amber-100 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {e.severity === "critical" ? <ShieldAlert className="w-3.5 h-3.5" /> :
                           e.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           <Zap className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            {e.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateID(e.createdAt)}
                          </p>
                          {e.payload && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 font-mono truncate">
                              {e.payload}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Answers list (metadata only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Jawaban per Soal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {answers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada jawaban tersimpan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar-thin">
                  {answers.map((a: any, idx: number) => (
                    <div key={a.id} className="border rounded-md p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">Soal #{idx + 1}</span>
                        {a.isGraded ? (
                          a.isCorrect ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-0.5" /> Benar
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 text-[10px]">
                              <XCircle className="w-3 h-3 mr-0.5" /> Salah
                            </Badge>
                          )
                        ) : a.revision > 0 ? (
                          <Badge variant="outline" className="text-blue-600 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-0.5" /> Terjawab
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Kosong
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{QUESTION_TYPE_LABEL[a.type] || a.type}</span>
                        {a.category && <span>{a.category}</span>}
                      </div>
                      {a.revision > 0 && (
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          rev {a.revision} · sync {formatAgo(a.updatedAt)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                * Hanya metadata jawaban yang ditampilkan. Isi jawaban & kunci jawaban tidak diekspos untuk menjaga integritas ujian.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          {/* Student info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Info Siswa</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{student.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  <p className="text-xs text-muted-foreground">@{student.username}</p>
                </div>
              </div>
              <div className="text-xs space-y-1 pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kelas:</span>
                  <span className="font-medium">{cls.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Percobaan:</span>
                  <span className="font-medium">#{a.attemptNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mulai:</span>
                  <span className="font-medium">{a.startedAt ? formatDateID(a.startedAt) : "—"}</span>
                </div>
                {a.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submit:</span>
                    <span className="font-medium">{formatDateID(a.submittedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Exam info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Info Ujian</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1.5">
              <div><span className="text-muted-foreground">Judul:</span> {exam.title}</div>
              <div><span className="text-muted-foreground">Durasi:</span> {exam.durationMinutes} mnt</div>
              <div><span className="text-muted-foreground">KKM:</span> {exam.passingScore}</div>
              <div><span className="text-muted-foreground">Total Soal:</span> {a.totalQuestions}</div>
              {exam.antiCheatingConfig && (
                <div className="pt-2 mt-2 border-t">
                  <p className="text-muted-foreground mb-1">Konfigurasi Anti-Cheat:</p>
                  <div className="space-y-0.5">
                    {exam.antiCheatingConfig.tabSwitchLimit != null && (
                      <p>• Limit tab switch: {exam.antiCheatingConfig.tabSwitchLimit}</p>
                    )}
                    {exam.antiCheatingConfig.fullscreenRequired && <p>• Fullscreen wajib</p>}
                    {exam.antiCheatingConfig.copyPasteBlocked && <p>• Copy-paste diblokir</p>}
                    {exam.antiCheatingConfig.cameraRequired && <p>• Kamera wajib</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Ringkasan Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(eventCounts).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Tidak ada event.</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(eventCounts).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{type.replace(/_/g, " ")}</span>
                      <Badge variant="outline">{count}x</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
