"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Edit, Eye, Send, Award, Users } from "lucide-react";
import { toast } from "sonner";
import { EXAM_STATUS_LABEL, formatDateID } from "@/lib/helpers";
import { useApp } from "@/stores/app-store";

export function ExamsManager({ mode }: { mode: "teacher" | "student" }) {
  const [items, setItems] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", subjectId: "", academicYearId: "", durationMinutes: 60,
    startAt: "", endAt: "", maxAttempts: 1, passingScore: 70,
    shuffleQuestions: true, shuffleOptions: true, allowBackNav: true, allowAnswerChange: true,
  });
  const { navigate } = useApp();

  const fetch = () => {
    setLoading(true);
    Promise.all([apiFetch("/api/exams"), apiFetch("/api/subjects"), apiFetch("/api/academic-years")]).then(([e, s, a]) => {
      if (e.ok) setItems(e.data?.exams || []);
      if (s.ok) setSubjects(s.data?.subjects || []);
      if (a.ok) setAcademicYears(a.data?.academicYears || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subjectId) { toast.error("Judul dan mapel wajib diisi."); return; }
    const r = await apiFetch("/api/exams", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      }),
    });
    if (r.ok) {
      toast.success("Ujian dibuat sebagai draft.");
      setOpen(false);
      setForm({ title: "", description: "", subjectId: "", academicYearId: "", durationMinutes: 60, startAt: "", endAt: "", maxAttempts: 1, passingScore: 70, shuffleQuestions: true, shuffleOptions: true, allowBackNav: true, allowAnswerChange: true });
      fetch();
    } else toast.error(r.error);
  };

  const publishExam = async (examId: string) => {
    if (!confirm("Publikasikan ujian ini? Setelah diterbitkan, soal tidak dapat diubah.")) return;
    const r = await apiFetch(`/api/exams/${examId}/publish`, { method: "POST" });
    if (r.ok) { toast.success("Ujian diterbitkan."); fetch(); }
    else toast.error(r.error);
  };

  // === STUDENT MODE ===
  if (mode === "student") {
    const now = new Date();
    const upcoming = items.filter((e) => e.startAt && new Date(e.startAt) > now);
    const available = items.filter((e) => {
      const startOk = !e.startAt || new Date(e.startAt) <= now;
      const endOk = !e.endAt || new Date(e.endAt) >= now;
      return startOk && endOk;
    });
    const completed = items.filter((e) => e.myAttempt && ["submitted", "graded", "reviewed", "published"].includes(e.myAttempt.status));

    return (
      <div className="space-y-5">
        <PageHeader title="Ujian Saya" description="Daftar ujian yang ditugaskan kepada Anda" />
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Ujian Tersedia</h3>
            {available.length === 0 ? <EmptyState icon={FileText} title="Tidak ada ujian tersedia" description="Belum ada ujian yang dapat dikerjakan saat ini." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {available.map((e) => (
                  <Card key={e.id} className="hover:border-primary/40">
                    <CardContent className="p-4">
                      <div className="mb-2">
                        <p className="font-semibold truncate">{e.title}</p>
                        <p className="text-xs text-muted-foreground">{e.subject?.name} · {e.assignmentClass?.name}</p>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                        <p>Durasi: {e.durationMinutes} menit</p>
                        <p>Soal: {e._count?.examQuestions || 0}</p>
                        {e.startAt && <p>Mulai: {formatDateID(e.startAt)}</p>}
                      </div>
                      {e.myAttempt?.status === "in_progress" ? (
                        <Button className="w-full" size="sm" onClick={() => navigate("exam-runner", { examId: e.id })}>Lanjutkan Ujian</Button>
                      ) : (
                        <Button className="w-full" size="sm" onClick={() => navigate("exam-runner", { examId: e.id })}>Mulai Ujian</Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {upcoming.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Akan Datang</h3>
              <div className="space-y-2">
                {upcoming.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 px-3 border rounded-md">
                    <div><p className="font-medium text-sm">{e.title}</p><p className="text-xs text-muted-foreground">{e.subject?.name} · Mulai: {formatDateID(e.startAt)}</p></div>
                    <Badge variant="outline">Akan datang</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {completed.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Sudah Dikerjakan</h3>
              <div className="space-y-2">
                {completed.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 px-3 border rounded-md">
                    <div><p className="font-medium text-sm">{e.title}</p><p className="text-xs text-muted-foreground">{e.subject?.name}</p></div>
                    <div className="text-right">
                      {e.myAttempt.status === "published" ? (
                        <Badge className="bg-primary">{e.myAttempt.finalScore}</Badge>
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

  // === TEACHER MODE ===
  return (
    <div className="space-y-5">
      <PageHeader
        title="Ujian Saya"
        description="Kelola ujian yang Anda buat"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Ujian Baru</Button></DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
              <DialogHeader><DialogTitle>Buat Ujian Baru</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Judul Ujian *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mata Pelajaran *</Label>
                    <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tahun Ajaran</Label>
                    <Select value={form.academicYearId} onValueChange={(v) => setForm({ ...form, academicYearId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>{academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name} {y.semester}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Waktu Mulai</Label>
                    <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waktu Selesai</Label>
                    <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Durasi (menit)</Label>
                    <Input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 60 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Maks Percobaan</Label>
                    <Input type="number" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) || 1 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nilai Lulus</Label>
                    <Input type="number" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: parseFloat(e.target.value) || 70 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <Label className="text-sm">Acak Soal</Label>
                    <Switch checked={form.shuffleQuestions} onCheckedChange={(v) => setForm({ ...form, shuffleQuestions: v })} />
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <Label className="text-sm">Acak Opsi</Label>
                    <Switch checked={form.shuffleOptions} onCheckedChange={(v) => setForm({ ...form, shuffleOptions: v })} />
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <Label className="text-sm">Bisa Kembali</Label>
                    <Switch checked={form.allowBackNav} onCheckedChange={(v) => setForm({ ...form, allowBackNav: v })} />
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <Label className="text-sm">Ubah Jawaban</Label>
                    <Switch checked={form.allowAnswerChange} onCheckedChange={(v) => setForm({ ...form, allowAnswerChange: v })} />
                  </div>
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit">Buat Draft</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardContent className="p-4">
          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           items.length === 0 ? <EmptyState icon={FileText} title="Belum ada ujian" description="Buat ujian pertama Anda." /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Ujian</TableHead>
                   <TableHead>Mapel</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Soal</TableHead>
                   <TableHead>Attempt</TableHead>
                   <TableHead className="text-right">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {items.map((e) => (
                   <TableRow key={e.id}>
                     <TableCell>
                       <p className="font-medium truncate max-w-xs">{e.title}</p>
                       {e.startAt && <p className="text-xs text-muted-foreground">{formatDateID(e.startAt)}</p>}
                     </TableCell>
                     <TableCell className="text-sm">{e.subject?.name}</TableCell>
                     <TableCell><StatusBadge status={e.status} label={EXAM_STATUS_LABEL[e.status]} /></TableCell>
                     <TableCell><Badge variant="secondary">{e._count?.examQuestions || 0}</Badge></TableCell>
                     <TableCell><Badge variant="outline">{e._count?.attempts || 0}</Badge></TableCell>
                     <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-1">
                         <Button variant="ghost" size="sm" onClick={() => navigate("exams.builder", { examId: e.id })}><Edit className="w-3.5 h-3.5" /></Button>
                         {e.status === "draft" && (
                           <Button variant="ghost" size="sm" onClick={() => publishExam(e.id)}><Send className="w-3.5 h-3.5" /></Button>
                         )}
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>}
        </CardContent>
      </Card>
    </div>
  );
}
