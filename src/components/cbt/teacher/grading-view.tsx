"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Award, Eye, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_TYPE_LABEL, formatDateID } from "@/lib/helpers";
import { useApp } from "@/stores/app-store";

export function GradingView({ attemptId }: { attemptId?: string }) {
  const { navigate } = useApp();
  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, { points: number; comment: string }>>({});
  const [saving, setSaving] = useState(false);

  const fetchExams = () => {
    setLoading(true);
    apiFetch("/api/exams").then((r) => {
      if (r.ok) setExams(r.data?.exams || []);
      setLoading(false);
    });
  };

  const loadAttempt = useCallback(async (aid: string) => {
    const r = await apiFetch(`/api/grade/${aid}`);
    if (r.ok) {
      setActiveAttempt(r.data?.attempt);
      const init: Record<string, any> = {};
      for (const a of r.data?.attempt?.answers || []) {
        init[a.questionId] = {
          points: a.pointsAwarded ?? 0,
          comment: a.teacherComment || "",
        };
      }
      setGradingAnswers(init);
    } else {
      toast.error(r.error);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (attemptId) {
      loadAttempt(attemptId);
    }
  }, [attemptId, loadAttempt]);

  const fetchAttempts = async (eid: string) => {
    setExamId(eid);
    const r = await apiFetch(`/api/exams/${eid}/results`);
    if (r.ok) setAttempts(r.data?.results || []);
  };

  const submitGrade = async (questionId: string) => {
    if (!activeAttempt) return;
    setSaving(true);
    const g = gradingAnswers[questionId];
    const r = await apiFetch(`/api/grade/${activeAttempt.id}`, {
      method: "PATCH",
      body: JSON.stringify({ questionId, pointsAwarded: g.points, teacherComment: g.comment }),
    });
    setSaving(false);
    if (r.ok) {
      toast.success("Nilai disimpan.");
      loadAttempt(activeAttempt.id);
    } else toast.error(r.error);
  };

  const publishResults = async () => {
    if (!activeAttempt?.exam?.id) return;
    if (!confirm("Publikasikan hasil ujian untuk semua siswa? Siswa akan dapat melihat nilainya.")) return;
    const r = await apiFetch(`/api/grade/publish/${activeAttempt.exam.id}`, { method: "POST" });
    if (r.ok) { toast.success("Hasil diterbitkan."); if (examId) fetchAttempts(examId); }
    else toast.error(r.error);
  };

  // === DETAIL VIEW ===
  if (activeAttempt) {
    const exam = activeAttempt.exam;
    const student = activeAttempt.enrollment?.student;
    const answers = activeAttempt.answers || [];
    const essayAnswers = answers.filter((a: any) => a.question?.type === "ESSAY");
    const objectiveAnswers = answers.filter((a: any) => ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "MULTIPLE_RESPONSE"].includes(a.question?.type));

    return (
      <div className="space-y-5">
        <PageHeader
          title="Koreksi Esai"
          description={`${student?.fullName} · ${exam?.title}`}
          action={<Button variant="outline" size="sm" onClick={() => { setActiveAttempt(null); navigate("grading"); }}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Nilai Otomatis (Objektif)</p>
              <p className="text-2xl font-bold">{objectiveAnswers.filter((a: any) => a.isCorrect).reduce((s: number, a: any) => s + (a.pointsAwarded || 0), 0)} / {objectiveAnswers.reduce((s: number, a: any) => s + (a.question?.examQuestions?.[0]?.points || a.question?.points || 0), 0)}</p>
              <p className="text-xs text-muted-foreground mt-2">{objectiveAnswers.length} soal objektif</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Esai (perlu koreksi)</p>
              <p className="text-2xl font-bold">{essayAnswers.filter((a: any) => a.gradedAt == null).length}</p>
              <p className="text-xs text-muted-foreground mt-2">{essayAnswers.length} total esai</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <StatusBadge status={activeAttempt.status} />
              {activeAttempt.finalScore != null && <p className="text-2xl font-bold mt-2">{activeAttempt.finalScore}</p>}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold">Soal Esai untuk Dikoreksi</h3>
            {essayAnswers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada esai dalam ujian ini.</p>
            ) : (
              <div className="space-y-4">
                {essayAnswers.map((a: any, idx: number) => {
                  const q = a.question;
                  const eq = q?.examQuestions?.[0];
                  const maxPoints = eq?.points || q?.points || 0;
                  return (
                    <div key={a.id} className="border rounded-md p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <Badge variant="secondary">Esai #{idx + 1}</Badge>
                          <Badge variant="outline">Max {maxPoints} pt</Badge>
                          {a.gradedAt && <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Sudah dinilai</Badge>}
                        </div>
                      </div>
                      <p className="text-sm mb-3 whitespace-pre-wrap">{q?.stem}</p>
                      <div className="bg-muted/50 rounded-md p-3 mb-3">
                        <p className="text-xs text-muted-foreground mb-1">Jawaban Siswa:</p>
                        <p className="text-sm whitespace-pre-wrap">{a.textAnswer || <span className="text-muted-foreground italic">Tidak dijawab</span>}</p>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[140px_1fr] gap-3 items-start">
                        <div className="space-y-1.5">
                          <Label>Nilai (0-{maxPoints})</Label>
                          <Input
                            type="number"
                            min={0}
                            max={maxPoints}
                            step={0.5}
                            value={gradingAnswers[a.questionId]?.points ?? 0}
                            onChange={(e) => setGradingAnswers((prev) => ({ ...prev, [a.questionId]: { ...prev[a.questionId], points: parseFloat(e.target.value) || 0 } }))}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Komentar (opsional)</Label>
                          <Textarea
                            rows={2}
                            value={gradingAnswers[a.questionId]?.comment || ""}
                            onChange={(e) => setGradingAnswers((prev) => ({ ...prev, [a.questionId]: { ...prev[a.questionId], comment: e.target.value } }))}
                            placeholder="Berikan feedback untuk siswa..."
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button size="sm" disabled={saving} onClick={() => submitGrade(a.questionId)}>Simpan Nilai</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Publikasi Hasil</p>
                <p className="text-xs text-muted-foreground">Setelah semua esai dinilai, publikasikan agar siswa dapat melihat nilainya.</p>
              </div>
              <Button onClick={publishResults}><Send className="w-4 h-4 mr-1" /> Publikasi</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === LIST VIEW ===
  return (
    <div className="space-y-5">
      <PageHeader title="Koreksi Esai" description="Pilih ujian untuk melihat daftar siswa yang perlu dikoreksi" />
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label>Pilih Ujian</Label>
              <Select value={examId} onValueChange={fetchAttempts}>
                <SelectTrigger><SelectValue placeholder="Pilih ujian..." /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title} ({e._count?.attempts || 0} attempt)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {examId && (
              <>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                </div>
                {attempts.length === 0 ? <EmptyState icon={Award} title="Belum ada attempt" description="Belum ada siswa yang mengumpulkan ujian ini." /> :
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submit</TableHead>
                          <TableHead>Insiden</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attempts.filter((a) => a.student?.fullName?.toLowerCase().includes(search.toLowerCase())).map((a) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <p className="font-medium">{a.student.fullName}</p>
                              <p className="text-xs text-muted-foreground">{a.student.email}</p>
                            </TableCell>
                            <TableCell><Badge variant="secondary">{a.className}</Badge></TableCell>
                            <TableCell><StatusBadge status={a.status} /></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.submittedAt ? formatDateID(a.submittedAt) : "—"}</TableCell>
                            <TableCell>{a.incidentCount > 0 ? <Badge variant="outline" className="text-amber-700">{a.incidentCount}</Badge> : "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => loadAttempt(a.id)}>
                                <Eye className="w-3.5 h-3.5 mr-1" /> Koreksi
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
