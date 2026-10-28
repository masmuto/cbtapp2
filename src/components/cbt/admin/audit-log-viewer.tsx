"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateID } from "@/lib/helpers";

export function AuditLogViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const limit = 50;

  const fetch = () => {
    setLoading(true);
    const offset = page * limit;
    apiFetch(`/api/audit?limit=${limit}&offset=${offset}`).then((r) => {
      if (r.ok) { setLogs(r.data?.logs || []); setTotal(r.data?.total || 0); }
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, [page]);

  const actions = [...new Set(logs.map((l) => l.action))];
  const filtered = logs.filter((l) => {
    const matchSearch = (l.actor?.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
                        (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
                        (l.targetType || "").toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Log" description="Riwayat aktivitas sistem (read-only)" />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari aktor atau aksi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Semua aksi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua aksi</SelectItem>
                {actions.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           filtered.length === 0 ? <EmptyState icon={ScrollText} title="Tidak ada log" /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Waktu</TableHead>
                   <TableHead>Aktor</TableHead>
                   <TableHead>Aksi</TableHead>
                   <TableHead>Target</TableHead>
                   <TableHead>Sekolah</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filtered.map((l) => (
                   <TableRow key={l.id}>
                     <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateID(l.createdAt)}</TableCell>
                     <TableCell className="text-sm">{l.actor?.fullName || "System"}</TableCell>
                     <TableCell><Badge variant="secondary">{l.action.replace(/_/g, " ")}</Badge></TableCell>
                     <TableCell className="text-sm text-muted-foreground">{l.targetType || "—"} {l.targetId ? `· ${l.targetId.slice(-6)}` : ""}</TableCell>
                     <TableCell className="text-sm text-muted-foreground">{l.school?.name || "—"}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">Total {total} log · Halaman {page + 1} dari {Math.ceil(total / limit) || 1}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
