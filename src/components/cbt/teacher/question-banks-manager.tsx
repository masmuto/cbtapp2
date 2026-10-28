"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookCopy, Plus, FileText, Trash2, Edit, Eye, Code, Upload, FileSpreadsheet, FileText as FileTextIcon, Download, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { QUESTION_TYPE_LABEL } from "@/lib/helpers";
import { useApp } from "@/stores/app-store";

export function QuestionBanksManager() {
  const [banks, setBanks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", subjectId: "" });
  const [activeBank, setActiveBank] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [qOpen, setQOpen] = useState(false);
  const [previewQ, setPreviewQ] = useState<any>(null);
  const [qForm, setQForm] = useState({
    type: "MULTIPLE_CHOICE", stem: "", difficulty: "MEDIUM", category: "", points: 1, explanation: "",
    options: [{ code: "A", text: "", isCorrect: false }, { code: "B", text: "", isCorrect: false }, { code: "C", text: "", isCorrect: false }, { code: "D", text: "", isCorrect: false }],
  });

  // === Import state ===
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const { navigate } = useApp();

  const fetchBanks = () => {
    setLoading(true);
    Promise.all([apiFetch("/api/question-banks"), apiFetch("/api/subjects")]).then(([b, s]) => {
      if (b.ok) setBanks(b.data?.banks || []);
      if (s.ok) setSubjects(s.data?.subjects || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetchBanks(); }, []);

  const selectBank = async (bank: any) => {
    setActiveBank(bank);
    const r = await apiFetch(`/api/questions?bankId=${bank.id}`);
    if (r.ok) setQuestions(r.data?.questions || []);
  };

  const createBank = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/question-banks", { method: "POST", body: JSON.stringify(form) });
    if (r.ok) {
      toast.success("Bank soal dibuat.");
      setOpen(false);
      setForm({ name: "", description: "", subjectId: "" });
      fetchBanks();
    } else toast.error(r.error);
  };

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBank) return;
    // Validate
    if (["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE", "TRUE_FALSE"].includes(qForm.type)) {
      const opts = qForm.options.filter((o) => o.text.trim());
      if (opts.length < 2) { toast.error("Minimal 2 opsi."); return; }
      if (!opts.some((o) => o.isCorrect)) { toast.error("Wajib ada opsi benar."); return; }
    }
    const tags = qForm.category ? [qForm.category] : [];
    const payload: any = {
      bankId: activeBank.id,
      type: qForm.type,
      stem: qForm.stem,
      difficulty: qForm.difficulty,
      category: qForm.category || null,
      tags,
      points: qForm.points,
      explanation: qForm.explanation || null,
      options: ["MULTIPLE_CHOICE", "MULTIPLE_RESPONSE", "TRUE_FALSE"].includes(qForm.type)
        ? qForm.options.filter((o) => o.text.trim())
        : qForm.type === "SHORT_ANSWER" ? [{ code: "KUNCI", text: qForm.options[0].text, isCorrect: true }] : [],
    };
    const r = await apiFetch("/api/questions", { method: "POST", body: JSON.stringify(payload) });
    if (r.ok) {
      toast.success("Soal dibuat.");
      setQOpen(false);
      setQForm({
        type: "MULTIPLE_CHOICE", stem: "", difficulty: "MEDIUM", category: "", points: 1, explanation: "",
        options: [{ code: "A", text: "", isCorrect: false }, { code: "B", text: "", isCorrect: false }, { code: "C", text: "", isCorrect: false }, { code: "D", text: "", isCorrect: false }],
      });
      selectBank(activeBank);
    } else toast.error(r.error);
  };

  const updateOption = (idx: number, field: string, value: any) => {
    setQForm((f) => ({ ...f, options: f.options.map((o, i) => i === idx ? { ...o, [field]: value } : o) }));
  };

  const isTrueFalse = qForm.type === "TRUE_FALSE";

  // === Import handlers ===
  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const valid = name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv") || name.endsWith(".docx");
    if (!valid) {
      toast.error("Format file tidak didukung. Gunakan .xlsx, .xls, .csv, atau .docx");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB.");
      return;
    }
    setImportFile(file);
    setImportResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleImport = async () => {
    if (!importFile || !activeBank) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("bankId", activeBank.id);
      formData.append("file", importFile);
      const res = await fetch("/api/questions/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        if (data.created > 0) {
          toast.success(`${data.created} soal berhasil diimpor.`);
          selectBank(activeBank); // refresh question list
        } else {
          toast.warning("Tidak ada soal yang berhasil diimpor. Periksa error di bawah.");
        }
      } else {
        toast.error(data?.error || "Gagal mengimpor file.");
      }
    } catch (e) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = (format: "xlsx" | "csv" | "docx") => {
    // Trigger download dari /download/template-import-soal.{ext}
    const url = `/download/template-import-soal.${format}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-import-soal.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Template ${format.toUpperCase()} diunduh.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank Soal"
        description="Kelola kumpulan soal per mata pelajaran"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Bank Baru</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Bank Soal Baru</DialogTitle></DialogHeader>
              <form onSubmit={createBank} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nama Bank *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Soal Aljabar Kelas 7" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Mata Pelajaran *</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Deskripsi</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                </div>
                <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit">Buat</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Banks list */}
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Daftar Bank</p>
            {loading ? <p className="text-sm text-muted-foreground py-4">Memuat...</p> :
             banks.length === 0 ? <p className="text-sm text-muted-foreground py-4">Belum ada bank.</p> :
             <div className="space-y-1 max-h-[60vh] overflow-y-auto scrollbar-thin">
               {banks.map((b) => (
                 <button key={b.id} onClick={() => selectBank(b)} className={`w-full text-left p-2 rounded-md border text-sm transition-colors ${activeBank?.id === b.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                   <p className="font-medium truncate">{b.name}</p>
                   <p className="text-xs text-muted-foreground">{b.subject?.name} · {b._count?.questions || 0} soal</p>
                 </button>
               ))}
             </div>}
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardContent className="p-4">
            {!activeBank ? (
              <EmptyState icon={BookCopy} title="Pilih Bank Soal" description="Pilih bank soal di kiri untuk melihat daftar soal." />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-semibold">{activeBank.name}</h3>
                    <p className="text-xs text-muted-foreground">{activeBank.subject?.name} · {questions.length} soal</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setImportOpen(true); setImportResult(null); setImportFile(null); }}>
                      <Upload className="w-4 h-4 mr-1" /> Import
                    </Button>
                    <Dialog open={qOpen} onOpenChange={setQOpen}>
                      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Soal Baru</Button></DialogTrigger>
                    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
                      <DialogHeader><DialogTitle>Buat Soal Baru</DialogTitle></DialogHeader>
                      <form onSubmit={createQuestion} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Tipe Soal</Label>
                            <Select value={qForm.type} onValueChange={(v) => {
                              setQForm({ ...qForm, type: v, options: v === "TRUE_FALSE" ? [{ code: "A", text: "Benar", isCorrect: false }, { code: "B", text: "Salah", isCorrect: false }] : v === "SHORT_ANSWER" ? [{ code: "KUNCI", text: "", isCorrect: true }] : qForm.options });
                            }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(QUESTION_TYPE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Kesulitan</Label>
                            <Select value={qForm.difficulty} onValueChange={(v) => setQForm({ ...qForm, difficulty: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="EASY">Mudah</SelectItem><SelectItem value="MEDIUM">Sedang</SelectItem><SelectItem value="HARD">Sulit</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Pertanyaan *</Label>
                          <Textarea value={qForm.stem} onChange={(e) => setQForm({ ...qForm, stem: e.target.value })} rows={3} placeholder="Tulis pertanyaan di sini..." required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Kategori</Label>
                            <Input value={qForm.category} onChange={(e) => setQForm({ ...qForm, category: e.target.value })} placeholder="cth: Aljabar" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Poin</Label>
                            <Input type="number" step="0.5" value={qForm.points} onChange={(e) => setQForm({ ...qForm, points: parseFloat(e.target.value) || 1 })} />
                          </div>
                        </div>

                        {/* Options */}
                        {(qForm.type === "MULTIPLE_CHOICE" || qForm.type === "MULTIPLE_RESPONSE" || qForm.type === "TRUE_FALSE") && (
                          <div className="space-y-2">
                            <Label>Opsi Jawaban</Label>
                            {qForm.options.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Badge variant="outline" className="w-8 justify-center">{opt.code}</Badge>
                                <Input value={opt.text} onChange={(e) => updateOption(idx, "text", e.target.value)} placeholder={`Teks opsi ${opt.code}`} className="flex-1" />
                                <label className="flex items-center gap-1 text-xs cursor-pointer whitespace-nowrap">
                                  <input type={qForm.type === "MULTIPLE_RESPONSE" ? "checkbox" : "radio"} name="correct" checked={opt.isCorrect} onChange={(e) => {
                                    if (qForm.type === "MULTIPLE_RESPONSE") updateOption(idx, "isCorrect", e.target.checked);
                                    else setQForm({ ...qForm, options: qForm.options.map((o, i) => ({ ...o, isCorrect: i === idx })) });
                                  }} />
                                  Benar
                                </label>
                              </div>
                            ))}
                          </div>
                        )}

                        {qForm.type === "SHORT_ANSWER" && (
                          <div className="space-y-1.5">
                            <Label>Kunci Jawaban</Label>
                            <Input value={qForm.options[0].text} onChange={(e) => updateOption(0, "text", e.target.value)} placeholder="Jawaban yang benar" />
                            <p className="text-xs text-muted-foreground">Akan dicocokkan case-insensitive.</p>
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <Label>Penjelasan (opsional)</Label>
                          <Textarea value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} rows={2} placeholder="Penjelasan jawaban..." />
                        </div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setQOpen(false)}>Batal</Button><Button type="submit">Simpan Soal</Button></DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  </div>
                </div>

                {questions.length === 0 ? (
                  <EmptyState icon={FileText} title="Belum ada soal" description="Tambahkan soal pertama Anda." />
                ) : (
                  <div className="space-y-2">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="border rounded-md p-3 hover:bg-muted/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="secondary">#{idx + 1}</Badge>
                              <Badge variant="outline">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                              <Badge variant="outline" className={q.difficulty === "EASY" ? "text-emerald-600" : q.difficulty === "HARD" ? "text-red-600" : ""}>{q.difficulty}</Badge>
                              <Badge variant="outline">{q.points} pt</Badge>
                              {q.category && <Badge variant="outline">{q.category}</Badge>}
                            </div>
                            <p className="text-sm line-clamp-2">{q.stem}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewQ(q)}><Eye className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewQ} onOpenChange={(v) => !v && setPreviewQ(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
          <DialogHeader><DialogTitle>Pratinjau Soal</DialogTitle></DialogHeader>
          {previewQ && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{QUESTION_TYPE_LABEL[previewQ.type]}</Badge>
                <Badge variant="outline">{previewQ.difficulty}</Badge>
                <Badge variant="outline">{previewQ.points} poin</Badge>
              </div>
              <p className="text-base whitespace-pre-wrap">{previewQ.stem}</p>
              {previewQ.imageUrl && <img src={previewQ.imageUrl} alt="" className="max-w-full rounded-md border" />}
              {previewQ.options?.length > 0 && (
                <div className="space-y-2">
                  {previewQ.options.filter((o: any) => o.code !== "KUNCI").map((o: any) => (
                    <div key={o.id} className={`flex items-start gap-2 p-2 rounded border ${o.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
                      <Badge variant="outline" className="w-7 justify-center">{o.code}</Badge>
                      <span className="text-sm">{o.text}</span>
                      {o.isCorrect && <Badge className="ml-auto bg-emerald-600">Kunci</Badge>}
                    </div>
                  ))}
                </div>
              )}
              {previewQ.explanation && (
                <div className="p-3 bg-muted/50 rounded-md text-sm">
                  <p className="font-semibold mb-1">Penjelasan:</p>
                  <p className="text-muted-foreground">{previewQ.explanation}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Import Soal dari Excel/Word</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info & Template */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>Format yang Didukung</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p><strong>.xlsx / .xls / .csv</strong>: Setiap baris = 1 soal, dengan kolom: <code>type, stem, points, difficulty, category, optionA-E, correctAnswer, explanation</code></p>
                <p><strong>.docx</strong>: Setiap soal dipisah baris kosong, format blok dengan marker [TYPE], A./B./C./D., ANSWER:, POINTS:, dll.</p>
                <p>Maksimal 5MB. Unduh template contoh di bawah.</p>
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate("xlsx")}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Template Excel
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate("csv")}>
                <FileTextIcon className="w-4 h-4 mr-1" /> Template CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate("docx")}>
                <FileTextIcon className="w-4 h-4 mr-1" /> Template Word
              </Button>
            </div>

            {/* Drop zone */}
            {!importResult && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.docx"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer inline-flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Klik untuk pilih file atau drag & drop</span>
                  <span className="text-xs text-muted-foreground">.xlsx, .xls, .csv, .docx (max 5MB)</span>
                </label>
                {importFile && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium">{importFile.name}</span>
                    <span className="text-muted-foreground">({(importFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {importResult && (
              <div className="space-y-3">
                <Alert variant={importResult.created > 0 ? "default" : "destructive"}>
                  {importResult.created > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4" />}
                  <AlertTitle>Hasil Import</AlertTitle>
                  <AlertDescription className="text-sm">
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-2 bg-emerald-50 rounded">
                        <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                        <p className="text-xs text-muted-foreground">Berhasil</p>
                      </div>
                      <div className="text-center p-2 bg-amber-50 rounded">
                        <p className="text-2xl font-bold text-amber-700">{importResult.skipped}</p>
                        <p className="text-xs text-muted-foreground">Gagal/Dilewati</p>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <p className="text-2xl font-bold">{importResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total Baris</p>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                {importResult.errors?.length > 0 && (
                  <div className="border rounded-md max-h-60 overflow-y-auto scrollbar-thin">
                    <div className="sticky top-0 bg-amber-50 px-3 py-2 border-b text-xs font-semibold text-amber-700">
                      Detail Error ({importResult.errors.length} baris gagal)
                    </div>
                    <div className="divide-y">
                      {importResult.errors.map((e: any, i: number) => (
                        <div key={i} className="px-3 py-2 text-xs">
                          <div className="flex items-start gap-2">
                            <Badge variant="outline" className="text-amber-700 shrink-0">Baris {e.row}</Badge>
                            <div className="min-w-0 flex-1">
                              <p className="text-muted-foreground truncate">{e.stem || "(stem kosong)"}</p>
                              <ul className="list-disc list-inside text-red-600 mt-0.5">
                                {e.errors.map((err: string, j: number) => <li key={j}>{err}</li>)}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {importResult ? (
              <>
                <Button variant="outline" onClick={() => { setImportResult(null); setImportFile(null); }}>
                  Import Lagi
                </Button>
                <Button onClick={() => setImportOpen(false)}>Selesai</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
                <Button onClick={handleImport} disabled={!importFile || importing}>
                  {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Mengimpor...</> : <><Upload className="w-4 h-4 mr-1" /> Import Sekarang</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
