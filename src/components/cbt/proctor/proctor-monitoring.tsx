"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState, StatusBadge } from "@/components/cbt/shared/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, ClipboardCheck, AlertTriangle, Search, ArrowLeft, ShieldAlert, Flag } from "lucide-react";
import { toast } from "sonner";
import { ATTEMPT_STATUS_LABEL, formatDateID } from "@/lib/helpers";
import { useApp } from "@/stores/app-store";

export function ProctorMonitoring() {
  const { navigate } = useApp();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagForm, setFlagForm] = useState({ type: "MANUAL_FLAG", note: "" });

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/proctoring").then((r) => {
      if (r.ok) setAttempts(r.data?.attempts || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); const t = setInterval(fetch, 5000); return () => clearInterval(t); }, []);

  const viewDetail = async (aid: string) => {
    const r = await apiFetch(`/api/proctoring/${aid}`);
    if (r.ok) setActiveAttempt(r.data?.attempt);
    else toast.error(r.error);
  };

  const submitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttempt) return;
    const r = await apiFetch(`/api/proctoring/${activeAttempt.id}`, {
      method: "POST", body: JSON.stringify(flagForm),
    });
    if (r.ok) {
      toast.success("Catatan pengawas dibuat.");
      setFlagOpen(false);
      setFlagForm({ type: "MANUAL_FLAG", note: "" });
      viewDetail(activeAttempt.id);
    } else toast.error(r.error);
  };

  // === DETAIL VIEW ===
  if (activeAttempt) {
    const events = activeAttempt.events || [];
    const incidents = events.filter((e: any) => e.severity === "warning" || e.severity === "critical");
    const records = activeAttempt.proctoring || [];
    return (
      <div className="space-y-5">
        <PageHeader
          title="Detail Monitoring Sesi"
          description={`${activeAttempt.enrollment?.student?.fullName} · ${activeAttempt.exam?.title}`}
          action={
            <Button variant="outline" size="sm" onClick={() => setActiveAttempt(null)}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={activeAttempt.status} label={ATTEMPT_STATUS_LABEL[activeAttempt.status]} /></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Mulai</p><p className="text-sm font-medium">{activeAttempt.startedAt ? formatDateID(activeAttempt.startedAt) : "—"}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sisa Waktu</p><p className="text-sm font-medium">{activeAttempt.serverEndsAt ? formatDateID(activeAttempt.serverEndsAt) : "—"}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Insiden</p><p className="text-2xl font-bold text-amber-600">{activeAttempt.incidentCount || 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-amber-600" /> Riwayat Insiden</CardTitle></CardHeader>
          <CardContent>
            {incidents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Tidak ada insiden.</p> :
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
                {incidents.slice(0, 50).map((e: any) => (
                  <div key={e.id} className="flex items-start gap-2 py-2 px-3 border rounded-md text-sm">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${e.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                    <div className="flex-1">
                      <p className="font-medium">{e.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{formatDateID(e.createdAt)}</p>
                      {e.payload && <p className="text-xs mt-1 text-muted-foreground">{e.payload}</p>}
                    </div>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flag className="w-4 h-4 text-primary" /> Catatan Pengawas</CardTitle></CardHeader>
          <CardContent>
            <Button size="sm" className="mb-3" onClick={() => setFlagOpen(true)}><Flag className="w-4 h-4 mr-1" /> Tandai / Tambah Catatan</Button>
            {records.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Belum ada catatan.</p> :
              <div className="space-y-2">
                {records.map((r: any) => (
                  <div key={r.id} className="border rounded-md p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{r.type.replace(/_/g, " ")}</Badge>
                      <Badge variant={r.status === "open" ? "secondary" : "default"}>{r.status}</Badge>
                    </div>
                    {r.note && <p className="text-muted-foreground">{r.note}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Oleh: {r.proctor?.fullName} · {formatDateID(r.createdAt)}</p>
                  </div>
                ))}
              </div>}
          </CardContent>
        </Card>

        <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Tandai / Tambah Catatan Pengawas</DialogTitle></DialogHeader>
            <form onSubmit={submitFlag} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select value={flagForm.type} onValueChange={(v) => setFlagForm({ ...flagForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL_FLAG">Tandai Manual</SelectItem>
                    <SelectItem value="SUSPICIOUS_TAB">Curiga Perpindahan Tab</SelectItem>
                    <SelectItem value="SUSPICIOUS_FOCUS">Curiga Hilang Fokus</SelectItem>
                    <SelectItem value="SIMILAR_ANSWER">Jawaban Mirip</SelectItem>
                    <SelectItem value="CAMERA_ISSUE">Masalah Kamera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Textarea value={flagForm.note} onChange={(e) => setFlagForm({ ...flagForm, note: e.target.value })} rows={3} placeholder="Detail insiden atau klarifikasi..." />
              </div>
              <DialogFooter><Button type="submit">Simpan</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // === LIST VIEW ===
  const filtered = attempts.filter((a) => {
    const matchSearch = a.student?.fullName?.toLowerCase().includes(search.toLowerCase()) || a.exam?.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Monitoring Ujian" description="Pantau sesi ujian yang ditugaskan kepada Anda" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari siswa atau ujian..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua status</SelectItem>
                <SelectItem value="in_progress">Sedang Berjalan</SelectItem>
                <SelectItem value="submitted">Dikumpulkan</SelectItem>
                <SelectItem value="graded">Dinilai</SelectItem>
                <SelectItem value="published">Diterbitkan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           filtered.length === 0 ? <EmptyState icon={ClipboardCheck} title="Tidak ada sesi" description="Tidak ada sesi ujian yang cocok dengan filter." /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Siswa</TableHead>
                   <TableHead>Ujian</TableHead>
                   <TableHead>Kelas</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Mulai</TableHead>
                   <TableHead>Insiden</TableHead>
                   <TableHead className="text-right">Aksi</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filtered.map((a) => (
                   <TableRow key={a.id} className={a.status === "in_progress" ? "bg-emerald-50/30" : ""}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{a.student?.fullName?.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                         <div><p className="font-medium">{a.student?.fullName}</p><p className="text-xs text-muted-foreground">{a.student?.email}</p></div>
                       </div>
                     </TableCell>
                     <TableCell className="text-sm">{a.exam?.title}</TableCell>
                     <TableCell><Badge variant="secondary">{a.class?.name}</Badge></TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1.5">
                         {a.status === "in_progress" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-soft-pulse" />}
                         <StatusBadge status={a.status} label={ATTEMPT_STATUS_LABEL[a.status]} />
                       </div>
                     </TableCell>
                     <TableCell className="text-xs text-muted-foreground">{a.startedAt ? formatDateID(a.startedAt) : "—"}</TableCell>
                     <TableCell>{a.incidentCount > 0 ? <Badge variant="outline" className="text-amber-700">{a.incidentCount}</Badge> : "—"}</TableCell>
                     <TableCell className="text-right">
                       <Button size="sm" variant="outline" onClick={() => viewDetail(a.id)}><Eye className="w-3.5 h-3.5 mr-1" /> Detail</Button>
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
