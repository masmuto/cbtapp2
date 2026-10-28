"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Trash2, Plus, FileText, Users, Eye, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_TYPE_LABEL, formatDateID } from "@/lib/helpers";
import { useApp } from "@/stores/app-store";

export function ExamBuilder({ examId }: { examId: string }) {
  const { navigate } = useApp();
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [proctors, setProctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addQOpen, setAddQOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({ classId: "", proctorId: "" });

  const fetch = () => {
    setLoading(true);
    Promise.all([
      apiFetch(`/api/exams/${examId}`),
      apiFetch(`/api/exams/${examId}/questions`),
      apiFetch("/api/question-banks"),
      apiFetch(`/api/exam-assignments?examId=${examId}`),
      apiFetch("/api/classes"),
      apiFetch("/api/teachers"),
    ]).then(([e, q, b, a, c, t]) => {
      if (e.ok) setExam(e.data?.exam);
      if (q.ok) setQuestions(q.data?.examQuestions || []);
      if (b.ok) setBanks(b.data?.banks || []);
      if (a.ok) setAssignments(a.data?.assignments || []);
      if (c.ok) setClasses(c.data?.classes || []);
      if (t.ok) setProctors(t.data?.teachers || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, [examId]);

  const fetchBankQuestions = async (bankId: string) => {
    setSelectedBank(bankId);
    const r = await apiFetch(`/api/questions?bankId=${bankId}`);
    if (r.ok) setBankQuestions(r.data?.questions || []);
  };

  const addQuestion = async (questionId: string, points: number) => {
    const r = await apiFetch(`/api/exams/${examId}/questions`, {
      method: "POST", body: JSON.stringify({ questionId, points }),
    });
    if (r.ok) { toast.success("Soal ditambahkan."); setAddQOpen(false); fetch(); }
    else toast.error(r.error);
  };

  const removeQuestion = async (examQuestionId: string) => {
    const r = await apiFetch(`/api/exams/${examId}/questions?examQuestionId=${examQuestionId}`, { method: "DELETE" });
    if (r.ok) { toast.success("Soal dihapus."); fetch(); } else toast.error(r.error);
  };

  const publishExam = async () => {
    if (!confirm("Publikasikan ujian? Setelah diterbitkan, soal tidak dapat diubah.")) return;
    const r = await apiFetch(`/api/exams/${examId}/publish`, { method: "POST" });
    if (r.ok) { toast.success("Ujian diterbitkan."); fetch(); } else toast.error(r.error);
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/exam-assignments", {
      method: "POST", body: JSON.stringify({ examId, classId: assignForm.classId, proctorId: assignForm.proctorId || null }),
    });
    if (r.ok) { toast.success("Penugasan dibuat."); setAssignOpen(false); setAssignForm({ classId: "", proctorId: "" }); fetch(); }
    else toast.error(r.error);
  };

  if (loading) return <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div>;
  if (!exam) return <div className="text-center py-8">Ujian tidak ditemukan.</div>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={exam.title}
        description={exam.description || "Detail dan kelola ujian"}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("exams")}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
            {exam.status === "draft" && (
              <Button size="sm" onClick={publishExam}><Send className="w-4 h-4 mr-1" /> Publikasikan</Button>
            )}
          </div>
        }
      />

      {/* Exam info */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={exam.status} /></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Mapel</p><p className="text-sm font-medium">{exam.subject?.name}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Durasi</p><p className="text-sm font-medium">{exam.durationMinutes} menit</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Nilai Lulus</p><p className="text-sm font-medium">{exam.passingScore}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Percobaan Max</p><p className="text-sm font-medium">{exam.maxAttempts}x</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Questions */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Soal Ujian ({questions.length})</span>
                {exam.status === "draft" && (
                  <Dialog open={addQOpen} onOpenChange={setAddQOpen}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Soal</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
                      <DialogHeader><DialogTitle>Pilih Soal dari Bank</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <Select value={selectedBank} onValueChange={fetchBankQuestions}>
                          <SelectTrigger><SelectValue placeholder="Pilih bank soal..." /></SelectTrigger>
                          <SelectContent>{banks.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b._count?.questions || 0})</SelectItem>)}</SelectContent>
                        </Select>
                        {selectedBank && (
                          <div className="space-y-2">
                            {bankQuestions.length === 0 ? <p className="text-sm text-muted-foreground">Bank kosong.</p> :
                             bankQuestions.map((q) => {
                               const alreadyAdded = questions.some((eq) => eq.questionId === q.id);
                               return (
                                 <div key={q.id} className="border rounded-md p-3">
                                   <div className="flex items-start justify-between gap-2">
                                     <div className="flex-1 min-w-0">
                                       <div className="flex gap-1 flex-wrap mb-1">
                                         <Badge variant="outline">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                                         <Badge variant="outline">{q.points} pt</Badge>
                                       </div>
                                       <p className="text-sm line-clamp-2">{q.stem}</p>
                                     </div>
                                     <Button size="sm" disabled={alreadyAdded} onClick={() => addQuestion(q.id, q.points)}>
                                       {alreadyAdded ? "Sudah ada" : "Tambah"}
                                     </Button>
                                   </div>
                                 </div>
                               );
                             })}
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada soal. {exam.status === "draft" && "Tambahkan soal dari bank."}</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((eq, idx) => (
                    <div key={eq.id} className="border rounded-md p-3 flex items-start gap-3">
                      <Badge variant="secondary" className="mt-0.5">{idx + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-1 flex-wrap mb-1">
                          <Badge variant="outline">{QUESTION_TYPE_LABEL[eq.exam?.type]}</Badge>
                          <Badge variant="outline">{eq.points} pt</Badge>
                        </div>
                        <p className="text-sm line-clamp-2">{eq.exam?.stem}</p>
                      </div>
                      {exam.status === "draft" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeQuestion(eq.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Assignments */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Penugasan</span>
                {exam.status === "draft" && (
                  <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                    <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /></Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Tugaskan ke Kelas</DialogTitle></DialogHeader>
                      <form onSubmit={createAssignment} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>Kelas *</Label>
                          <Select value={assignForm.classId} onValueChange={(v) => setAssignForm({ ...assignForm, classId: v })}>
                            <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Pengawas</Label>
                          <Select value={assignForm.proctorId} onValueChange={(v) => setAssignForm({ ...assignForm, proctorId: v })}>
                            <SelectTrigger><SelectValue placeholder="Pilih pengawas (opsional)" /></SelectTrigger>
                            <SelectContent>{proctors.map((p) => <SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <DialogFooter><Button type="submit">Tugaskan</Button></DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada penugasan.</p> :
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div key={a.id} className="border rounded-md p-2 text-sm">
                      <p className="font-medium">{a.class?.name}</p>
                      <p className="text-xs text-muted-foreground">Pengawas: {a.proctor?.fullName || "—"}</p>
                    </div>
                  ))}
                </div>}
            </CardContent>
          </Card>

          {exam.status === "published" && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Monitoring</CardTitle></CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("monitoring")}>
                  <ClipboardList className="w-4 h-4 mr-1" /> Buka Monitoring
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
