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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, ClipboardCheck, Eye } from "lucide-react";
import { ATTEMPT_STATUS_LABEL, formatDateID } from "@/lib/helpers";

export function AdminMonitoring() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/proctoring").then((r) => {
      if (r.ok) setAttempts(r.data?.attempts || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); const t = setInterval(fetch, 10000); return () => clearInterval(t); }, []);

  const filtered = attempts.filter((a) => {
    const matchSearch = a.student?.fullName?.toLowerCase().includes(search.toLowerCase()) || a.exam?.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = attempts.filter((a) => a.status === "in_progress").length;
  const incidentCount = attempts.filter((a) => a.incidentCount > 0).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Monitoring Ujian" description="Pantau seluruh sesi ujian yang berjalan di sekolah" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Sesi</p><p className="text-2xl font-bold">{attempts.length}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sedang Berjalan</p><p className="text-2xl font-bold text-emerald-600">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Dengan Insiden</p><p className="text-2xl font-bold text-amber-600">{incidentCount}</p></CardContent></Card>
        <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Sudah Selesai</p><p className="text-2xl font-bold">{attempts.filter((a) => ["submitted", "graded", "published"].includes(a.status)).length}</p></CardContent></Card>
      </div>

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
           filtered.length === 0 ? <EmptyState icon={ClipboardCheck} title="Tidak ada sesi" /> :
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
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filtered.slice(0, 100).map((a) => (
                   <TableRow key={a.id} className={a.status === "in_progress" ? "bg-emerald-50/30" : ""}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{a.student?.fullName?.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                         <div><p className="font-medium text-sm">{a.student?.fullName}</p><p className="text-xs text-muted-foreground">{a.student?.email}</p></div>
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
