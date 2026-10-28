"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, Search, Send, Download, Users, TrendingUp, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatDateID } from "@/lib/helpers";

export function ResultsView() {
  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [examInfo, setExamInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiFetch("/api/exams").then((r) => {
      if (r.ok) setExams(r.data?.exams || []);
      setLoading(false);
    });
  }, []);

  const fetchResults = async (eid: string) => {
    setExamId(eid);
    const r = await apiFetch(`/api/exams/${eid}/results`);
    if (r.ok) { setResults(r.data?.results || []); setExamInfo(r.data?.exam); }
  };

  const publishResults = async () => {
    if (!examId) return;
    if (!confirm("Publikasikan semua hasil yang sudah dinilai? Siswa akan dapat melihat nilainya.")) return;
    const r = await apiFetch(`/api/grade/publish/${examId}`, { method: "POST" });
    if (r.ok) { toast.success("Hasil diterbitkan."); fetchResults(examId); } else toast.error(r.error);
  };

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ["Nama", "Kelas", "Status", "Nilai", "Lulus", "Submit", "Insiden"];
    const rows = results.map((r) => [r.student.fullName, r.className, r.status, r.finalScore ?? "—", r.isPassed ? "Ya" : r.isPassed === false ? "Tidak" : "—", r.submittedAt ? formatDateID(r.submittedAt) : "—", r.incidentCount]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hasil-${examInfo?.title || "ujian"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh.");
  };

  const stats = {
    total: results.length,
    submitted: results.filter((r) => ["submitted", "graded", "reviewed", "published"].includes(r.status)).length,
    graded: results.filter((r) => ["graded", "published"].includes(r.status)).length,
    published: results.filter((r) => r.status === "published").length,
    passed: results.filter((r) => r.isPassed === true).length,
    avgScore: results.filter((r) => r.finalScore != null).length > 0
      ? Math.round(results.filter((r) => r.finalScore != null).reduce((sum, r) => sum + (r.finalScore || 0), 0) / results.filter((r) => r.finalScore != null).length)
      : 0,
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Hasil & Publikasi Nilai" description="Lihat hasil ujian dan publikasikan ke siswa" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={examId} onValueChange={fetchResults}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih ujian..." /></SelectTrigger>
              <SelectContent>{exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}</SelectContent>
            </Select>
            {examId && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export</Button>
                <Button onClick={publishResults}><Send className="w-4 h-4 mr-1" /> Publikasi</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {examId && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Siswa</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Submit</p><p className="text-2xl font-bold">{stats.submitted}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Dinilai</p><p className="text-2xl font-bold">{stats.graded}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Rata-rata</p><p className="text-2xl font-bold">{stats.avgScore}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Lulus</p><p className="text-2xl font-bold text-emerald-600">{stats.passed}</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
              </div>
              {results.length === 0 ? <EmptyState icon={Award} title="Belum ada attempt" /> :
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Siswa</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Nilai</TableHead>
                        <TableHead>Submit</TableHead>
                        <TableHead>Insiden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.filter((r) => r.student?.fullName?.toLowerCase().includes(search.toLowerCase())).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell><p className="font-medium">{r.student.fullName}</p><p className="text-xs text-muted-foreground">{r.student.email}</p></TableCell>
                          <TableCell><Badge variant="secondary">{r.className}</Badge></TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell>
                            {r.finalScore != null ? (
                              <Badge variant={r.isPassed ? "default" : "secondary"} className={r.isPassed ? "bg-emerald-600" : "bg-amber-100 text-amber-700"}>{r.finalScore}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.submittedAt ? formatDateID(r.submittedAt) : "—"}</TableCell>
                          <TableCell>{r.incidentCount > 0 ? <Badge variant="outline" className="text-amber-700">{r.incidentCount}</Badge> : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
