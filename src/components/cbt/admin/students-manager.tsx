"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Search, Download } from "lucide-react";
import { toast } from "sonner";

export function StudentsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", username: "", password: "", classId: "", nis: "" });

  const fetch = () => {
    setLoading(true);
    Promise.all([
      apiFetch(filterClass ? `/api/students?classId=${filterClass}` : "/api/students"),
      apiFetch("/api/classes"),
    ]).then(([s, c]) => {
      if (s.ok) setItems(s.data?.students || []);
      if (c.ok) setClasses(c.data?.classes || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, [filterClass]);

  const filtered = items.filter((t) => t.fullName.toLowerCase().includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase()) || (t.nis || "").includes(search));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/students", { method: "POST", body: JSON.stringify(form) });
    if (r.ok) {
      toast.success("Siswa berhasil ditambahkan.");
      setOpen(false);
      setForm({ fullName: "", email: "", username: "", password: "", classId: "", nis: "" });
      fetch();
    } else toast.error(r.error);
  };

  const exportCSV = () => {
    const headers = ["Nama", "Email", "Username", "NIS", "Kelas", "Status"];
    const rows = filtered.map((s) => [s.fullName, s.email, s.username, s.nis || "", s.className, s.status]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-siswa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh.");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Siswa"
        description="Kelola akun siswa dan kelasnya"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Siswa</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Tambah Siswa Baru</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nama Lengkap *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Username *</Label>
                      <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>NIS</Label>
                      <Input value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password *</Label>
                      <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kelas *</Label>
                    <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                      <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button type="submit">Simpan</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua kelas</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           filtered.length === 0 ? <EmptyState icon={Users} title="Belum ada siswa" /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow><TableHead>Siswa</TableHead><TableHead>NIS</TableHead><TableHead>Kelas</TableHead><TableHead>Status</TableHead></TableRow>
               </TableHeader>
               <TableBody>
                 {filtered.map((s) => (
                   <TableRow key={s.id}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{s.fullName.split(" ").map((x: string) => x[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                         <div><p className="font-medium">{s.fullName}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
                       </div>
                     </TableCell>
                     <TableCell className="text-sm">{s.nis || "—"}</TableCell>
                     <TableCell><Badge variant="secondary">{s.className}</Badge></TableCell>
                     <TableCell><Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status === "active" ? "Aktif" : s.status}</Badge></TableCell>
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
