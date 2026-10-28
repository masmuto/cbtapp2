"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { useApp } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, Circle, AlertCircle,
  Send, Loader2, Wifi, WifiOff, Shield, Eye, EyeOff, AlertTriangle, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QUESTION_TYPE_LABEL } from "@/lib/helpers";

interface Option {
  id: string;
  code: string;
  text: string;
}

interface Question {
  examQuestionId: string;
  questionId: string;
  orderIndex: number;
  type: string;
  stem: string;
  imageUrl?: string | null;
  difficulty: string;
  category?: string | null;
  points: number;
  options: Option[];
  myAnswer?: {
    selectedOptionCodes: string[] | null;
    textAnswer: string | null;
    isSynced: boolean;
    revision: number;
  } | null;
}

interface Attempt {
  id: string;
  status: string;
  attemptNo: number;
  startedAt: string | null;
  serverEndsAt: string | null;
  submittedAt: string | null;
  finalScore?: number | null;
  isPassed?: boolean | null;
}

interface Exam {
  id: string;
  title: string;
  durationMinutes: number;
  allowBackNav: boolean;
  allowAnswerChange: boolean;
  antiCheatingConfig?: any;
}

type SyncStatus = "idle" | "saving" | "saved" | "error" | "offline";

export function ExamRunner({ examId }: { examId: string }) {
  const { navigate, user } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { codes: string[] | null; text: string | null; revision: number }>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [online, setOnline] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState<string | null>(null);
  const [antiCheatConfig, setAntiCheatConfig] = useState<any>({});

  // Pending sync queue
  const pendingSyncRef = useRef<Set<string>>(new Set());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch exam & attempt
  const fetchExam = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await apiFetch(`/api/exams/${examId}/attempts`);
    setLoading(false);
    if (!r.ok) {
      setError(r.error || "Gagal memuat ujian.");
      return;
    }
    const data = r.data!;
    setAttempt(data.attempt);
    setExam(data.exam);
    if (data.exam?.antiCheatingConfig) {
      setAntiCheatConfig(data.exam.antiCheatingConfig);
    }
    if (data.questions) {
      setQuestions(data.questions);
      // Initialize answers from existing
      const init: Record<string, any> = {};
      for (const q of data.questions) {
        if (q.myAnswer) {
          init[q.questionId] = {
            codes: q.myAnswer.selectedOptionCodes,
            text: q.myAnswer.textAnswer,
            revision: q.myAnswer.revision,
          };
        } else {
          init[q.questionId] = { codes: null, text: null, revision: 0 };
        }
      }
      setAnswers(init);
    }
    // Jika attempt sudah selesai → tampilkan hasil
    if (data.attempt && data.attempt.status !== "in_progress") {
      setShowResult(true);
    }
  }, [examId]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  // === AUTOSAVE (declared early so submit can use it) ===
  const syncAnswer = useCallback(async (questionId: string) => {
    if (!attempt || attempt.status !== "in_progress") return;
    const ans = answers[questionId];
    if (!ans) return;
    setSyncStatus("saving");
    const r = await apiFetch("/api/answers", {
      method: "POST",
      body: JSON.stringify({
        attemptId: attempt.id,
        questionId,
        selectedOptionCodes: ans.codes,
        textAnswer: ans.text,
        revision: ans.revision + 1,
      }),
    });
    if (r.ok) {
      setSyncStatus("saved");
      setAnswers((prev) => ({ ...prev, [questionId]: { ...ans, revision: ans.revision + 1 } }));
      pendingSyncRef.current.delete(questionId);
      setTimeout(() => setSyncStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    } else if (r.status === 410) {
      // Auto-submited by server
      toast.error("Waktu ujian telah berakhir. Jawaban otomatis dikumpulkan.");
      fetchExam();
    } else if (r.error?.includes("stale")) {
      setSyncStatus("saved");
    } else {
      setSyncStatus("error");
      pendingSyncRef.current.add(questionId);
    }
  }, [attempt, answers, fetchExam]);

  // === SUBMIT (declared early so timer can call it) ===
  const handleSubmit = useCallback(async (auto = false) => {
    if (!attempt) return;
    if (!auto) setShowSubmitDialog(false);
    setSubmitting(true);
    // Sync semua pending answers first
    if (pendingSyncRef.current.size > 0) {
      await Promise.all([...pendingSyncRef.current].map((qid) => syncAnswer(qid)));
    }
    const r = await apiFetch(`/api/exams/${examId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ attemptId: attempt.id, confirm: true }),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success(auto ? "Waktu ujian berakhir. Jawaban otomatis dikumpulkan." : "Ujian berhasil dikumpulkan.");
      await fetchExam();
      setShowResult(true);
    } else {
      toast.error(r.error || "Gagal mengumpulkan ujian.");
    }
  }, [attempt, examId, syncAnswer, fetchExam]);

  // === TIMER (server-based) ===
  const [remainingSec, setRemainingSec] = useState(0);
  useEffect(() => {
    if (!attempt?.serverEndsAt) return;
    const update = () => {
      const now = Date.now();
      const ends = new Date(attempt.serverEndsAt!).getTime();
      const diff = Math.floor((ends - now) / 1000);
      setRemainingSec(Math.max(0, diff));
      if (diff <= 0) {
        // Auto-submit
        handleSubmit(true);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [attempt?.serverEndsAt, handleSubmit]);

  // === HEARTBEAT ===
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    heartbeatRef.current = setInterval(async () => {
      await apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({ attemptId: attempt.id, type: "HEARTBEAT" }),
      });
    }, 30000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [attempt?.id, attempt?.status]);

  // Sync pending queue periodically
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    syncIntervalRef.current = setInterval(() => {
      if (pendingSyncRef.current.size > 0 && navigator.onLine) {
        pendingSyncRef.current.forEach((qid) => syncAnswer(qid));
      }
    }, 5000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [attempt, syncAnswer]);

  // === ANTI-CHEAT: tab visibility, fullscreen, focus ===
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    if (typeof window === "undefined") return;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitchCount((c) => c + 1);
        apiFetch("/api/events", {
          method: "POST",
          body: JSON.stringify({ attemptId: attempt.id, type: "TAB_SWITCH", severity: "warning", payload: { count: tabSwitchCount + 1 } }),
        });
        setShowWarning("Perpindahan tab terdeteksi. Aktivitas ini dicatat dan dilaporkan kepada pengawas.");
        setTimeout(() => setShowWarning(null), 5000);
      }
    };
    const handleBlur = () => {
      apiFetch("/api/events", {
        method: "POST",
        body: JSON.stringify({ attemptId: attempt.id, type: "FOCUS_LOSS", severity: "warning" }),
      });
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        apiFetch("/api/events", {
          method: "POST",
          body: JSON.stringify({ attemptId: attempt.id, type: "FULLSCREEN_EXIT", severity: "warning" }),
        });
        if (antiCheatConfig.fullscreenRequired) {
          setShowWarning("Anda keluar dari mode layar penuh. Disarankan untuk kembali ke mode fullscreen.");
          setTimeout(() => setShowWarning(null), 5000);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Online/offline detection
    const handleOnline = () => { setOnline(true); setSyncStatus("idle"); toast.success("Koneksi internet pulih."); };
    const handleOffline = () => { setOnline(false); setSyncStatus("offline"); toast.error("Koneksi internet terputus. Jawaban disimpan lokal & akan disinkronkan."); };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Block copy-paste if configured
    const blockCopyPaste = (e: ClipboardEvent) => {
      if (antiCheatConfig.copyPasteBlocked) {
        e.preventDefault();
        toast.error("Salin-tempel dinonaktifkan selama ujian.");
      }
    };
    const blockContextMenu = (e: MouseEvent) => {
      if (antiCheatConfig.copyPasteBlocked) e.preventDefault();
    };

    document.addEventListener("copy", blockCopyPaste);
    document.addEventListener("paste", blockCopyPaste);
    document.addEventListener("cut", blockCopyPaste);
    document.addEventListener("contextmenu", blockContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("copy", blockCopyPaste);
      document.removeEventListener("paste", blockCopyPaste);
      document.removeEventListener("cut", blockCopyPaste);
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [attempt?.id, attempt?.status, antiCheatConfig]);

  // === ANSWER HANDLERS ===
  const setOptionAnswer = (questionId: string, type: string, code: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { codes: null, text: null, revision: 0 };
      let newCodes: string[] | null;
      if (type === "MULTIPLE_CHOICE" || type === "TRUE_FALSE") {
        newCodes = [code];
      } else if (type === "MULTIPLE_RESPONSE") {
        const existing = current.codes || [];
        newCodes = existing.includes(code) ? existing.filter((c) => c !== code) : [...existing, code];
      } else {
        newCodes = current.codes;
      }
      return { ...prev, [questionId]: { ...current, codes: newCodes } };
    });
    // Mark as pending sync
    pendingSyncRef.current.add(questionId);
    // Trigger sync after debounce
    setTimeout(() => syncAnswer(questionId), 800);
  };

  const setTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { codes: null, text: null, revision: 0 };
      return { ...prev, [questionId]: { ...current, text } };
    });
    pendingSyncRef.current.add(questionId);
  };

  // Debounced autosave for text
  const debounceSync = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const handleTextChange = (questionId: string, text: string) => {
    setTextAnswer(questionId, text);
    if (debounceSync.current.has(questionId)) {
      clearTimeout(debounceSync.current.get(questionId)!);
    }
    debounceSync.current.set(questionId, setTimeout(() => syncAnswer(questionId), 1500));
  };

  // === EXIT FULLSCREEN HANDLER ===
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      toast.error("Browser tidak mendukung fullscreen.");
    }
  };

  // === LOADING ===
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Menyiapkan ujian...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Gagal Memuat Ujian</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate("dashboard")}>Kembali ke Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === RESULT SCREEN ===
  if (showResult && attempt && (attempt.status === "submitted" || attempt.status === "graded" || attempt.status === "published")) {
    const isGraded = attempt.status === "graded" || attempt.status === "published";
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Ujian Berhasil Dikumpulkan</h2>
            <p className="text-muted-foreground mb-6">{exam?.title}</p>

            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold">
                {isGraded ? "Sudah Dinilai" : "Menunggu Koreksi Guru"}
              </p>
            </div>

            {isGraded && attempt.finalScore != null && (
              <div className="bg-primary/5 rounded-lg p-6 mb-4">
                <p className="text-xs text-primary uppercase tracking-wider mb-2">Nilai Akhir</p>
                <p className={cn("text-5xl font-bold", attempt.isPassed ? "text-emerald-600" : "text-amber-600")}>
                  {attempt.finalScore}
                </p>
                <Badge variant={attempt.isPassed ? "default" : "secondary"} className="mt-2">
                  {attempt.isPassed ? "LULUS" : "BELUM LULUS"}
                </Badge>
              </div>
            )}

            <p className="text-xs text-muted-foreground mb-4">
              {isGraded
                ? "Nilai Anda telah dikirim. Anda dapat melihat detail nilai setelah guru menerbitkan hasil (jika belum)."
                : "Soal esai sedang dikoreksi oleh guru. Hasil akan dipublikasikan setelah koreksi selesai."}
            </p>

            <Button className="w-full" onClick={() => navigate("dashboard")}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === EXAM UI ===
  if (!exam || !attempt || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Tidak ada soal.</p>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAns = answers[currentQ.questionId] || { codes: null, text: null, revision: 0 };
  const answeredCount = Object.values(answers).filter((a) => (a.codes && a.codes.length > 0) || (a.text && a.text.trim())).length;
  const progressPct = (answeredCount / questions.length) * 100;

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const isLowTime = remainingSec < 60;
  const isCriticalTime = remainingSec < 30;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col exam-no-select">
      {/* Topbar - Timer & Status */}
      <header className="sticky top-0 z-30 bg-primary text-primary-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-3 lg:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium truncate hidden sm:block">{exam.title}</p>
            <p className="text-sm font-medium sm:hidden">CBT</p>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Sync status */}
            <div className="flex items-center gap-1.5 text-xs">
              {syncStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> <span className="hidden sm:inline">Menyimpan...</span></>}
              {syncStatus === "saved" && <><CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">Tersimpan</span></>}
              {syncStatus === "error" && <><AlertCircle className="w-3 h-3" /> <span className="hidden sm:inline">Gagal sync</span></>}
              {syncStatus === "offline" && <><WifiOff className="w-3 h-3" /> <span className="hidden sm:inline">Offline</span></>}
              {syncStatus === "idle" && online && <><Wifi className="w-3 h-3 opacity-50" /></>}
            </div>

            {/* Timer */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 lg:px-3 py-1 rounded-md font-mono font-bold text-sm tabular-nums",
              isCriticalTime ? "bg-red-500 text-white animate-pulse" :
              isLowTime ? "bg-amber-400 text-amber-950" : "bg-primary-foreground/15"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(remainingSec)}
            </div>

            <Button
              size="sm"
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitting}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">Kumpulkan</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Tab switch warning */}
      {showWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{showWarning}</span>
        </div>
      )}

      {/* Offline banner */}
      {!online && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm text-destructive flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Anda sedang offline. Jawaban disimpan lokal & akan disinkronkan saat koneksi pulih.</span>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full p-3 lg:p-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Question Area */}
        <div className="space-y-4">
          {/* Question header */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Soal {currentIdx + 1} / {questions.length}</Badge>
                  <Badge variant="outline">{QUESTION_TYPE_LABEL[currentQ.type] || currentQ.type}</Badge>
                  <Badge variant="outline">{currentQ.points} poin</Badge>
                  {currentQ.difficulty && (
                    <Badge variant="outline" className={
                      currentQ.difficulty === "EASY" ? "text-emerald-600" :
                      currentQ.difficulty === "HARD" ? "text-red-600" : "text-amber-600"
                    }>{currentQ.difficulty}</Badge>
                  )}
                </div>
              </div>

              <div className="prose prose-sm max-w-none">
                <p className="text-base lg:text-lg leading-relaxed whitespace-pre-wrap text-foreground">{currentQ.stem}</p>
                {currentQ.imageUrl && (
                  <img src={currentQ.imageUrl} alt="Gambar soal" className="mt-4 max-w-full rounded-lg border" />
                )}
              </div>

              {/* Answer Area */}
              <div className="mt-6">
                {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "TRUE_FALSE") && (
                  <RadioGroup
                    value={currentAns.codes?.[0] || ""}
                    onValueChange={(v) => setOptionAnswer(currentQ.questionId, currentQ.type, v)}
                  >
                    <div className="space-y-2">
                      {currentQ.options.map((opt) => (
                        <label
                          key={opt.id}
                          htmlFor={opt.id}
                          className={cn(
                            "flex items-start gap-3 p-3 lg:p-4 rounded-lg border cursor-pointer transition-all",
                            "hover:bg-muted/50",
                            currentAns.codes?.[0] === opt.code ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                          )}
                        >
                          <RadioGroupItem value={opt.code} id={opt.id} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm mr-2">{opt.code}.</span>
                            <span className="text-sm lg:text-base">{opt.text}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                )}

                {currentQ.type === "MULTIPLE_RESPONSE" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">Pilih semua jawaban yang benar.</p>
                    {currentQ.options.map((opt) => {
                      const checked = currentAns.codes?.includes(opt.code) || false;
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex items-start gap-3 p-3 lg:p-4 rounded-lg border cursor-pointer transition-all",
                            "hover:bg-muted/50",
                            checked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                          )}
                        >
                          <Checkbox
                            id={opt.id}
                            checked={checked}
                            onCheckedChange={() => setOptionAnswer(currentQ.questionId, currentQ.type, opt.code)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm mr-2">{opt.code}.</span>
                            <span className="text-sm lg:text-base">{opt.text}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentQ.type === "SHORT_ANSWER" && (
                  <div className="space-y-2">
                    <Label htmlFor="short-answer">Jawaban singkat Anda:</Label>
                    <Input
                      id="short-answer"
                      value={currentAns.text || ""}
                      onChange={(e) => handleTextChange(currentQ.questionId, e.target.value)}
                      placeholder="Ketik jawaban..."
                      className="max-w-md"
                    />
                  </div>
                )}

                {currentQ.type === "ESSAY" && (
                  <div className="space-y-2">
                    <Label htmlFor="essay-answer">Jawaban esai Anda:</Label>
                    <Textarea
                      id="essay-answer"
                      value={currentAns.text || ""}
                      onChange={(e) => handleTextChange(currentQ.questionId, e.target.value)}
                      placeholder="Tulis jawaban Anda dengan lengkap..."
                      rows={8}
                      className="resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      {currentAns.text?.length || 0} karakter · Jawaban tersimpan otomatis.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0 || !exam.allowBackNav}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
            </Button>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {answeredCount} dari {questions.length} terjawab
            </p>
            <Button
              onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))}
              disabled={currentIdx === questions.length - 1}
            >
              Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Sidebar - Question Navigator */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Navigasi Soal</span>
                <Badge variant="secondary">{answeredCount}/{questions.length}</Badge>
              </CardTitle>
              <Progress value={progressPct} className="h-1.5" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-5 lg:grid-cols-4 gap-1.5 max-h-80 overflow-y-auto scrollbar-thin">
                {questions.map((q, i) => {
                  const ans = answers[q.questionId];
                  const isAnswered = (ans?.codes && ans.codes.length > 0) || (ans?.text && ans.text.trim());
                  const isCurrent = i === currentIdx;
                  return (
                    <button
                      key={q.questionId}
                      onClick={() => setCurrentIdx(i)}
                      className={cn(
                        "aspect-square rounded-md text-xs font-semibold border transition-all flex items-center justify-center",
                        isCurrent ? "ring-2 ring-primary ring-offset-1" : "",
                        isAnswered ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" /> Sudah dijawab
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-border" /> Belum dijawab
                </div>
              </div>

              <Button
                className="w-full mt-4"
                variant="destructive"
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
              >
                <Send className="w-4 h-4 mr-1" /> Kumpulkan Ujian
              </Button>
            </CardContent>
          </Card>

          {/* Anti-cheat info */}
          <Card className="mt-3">
            <CardContent className="p-3">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <Shield className="w-3 h-3 text-primary" /> Pantauan Anti-Curang
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Perpindahan tab: <span className={tabSwitchCount > 0 ? "text-amber-600 font-medium" : ""}>{tabSwitchCount}x</span></p>
                {antiCheatConfig.fullscreenRequired && (
                  <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" onClick={enterFullscreen}>
                    <Eye className="w-3 h-3 mr-1" /> Aktifkan Fullscreen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan Ujian?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda telah menjawab <strong>{answeredCount} dari {questions.length}</strong> soal.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-amber-600">
                  Masih ada {questions.length - answeredCount} soal yang belum dijawab. Soal yang tidak dijawab akan dianggap salah.
                </span>
              )}
              <span className="block mt-2">Setelah dikumpulkan, Anda tidak dapat mengubah jawaban lagi.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Mengumpulkan...</> : <><Send className="w-4 h-4 mr-1" /> Ya, Kumpulkan</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
