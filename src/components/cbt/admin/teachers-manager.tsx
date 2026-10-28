"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export function TeachersManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", username: "", phone: "", password: "" });

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/teachers").then((r) => {
      if (r.ok) setItems(r.data?.teachers || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const filtered = items.filter((t) => t.fullName.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/teachers", { method: "POST", body: JSON.stringify(form) });
    if (r.ok) {
      toast.success("Guru berhasil ditambahkan.");
      setOpen(false);
      setForm({ fullName: "", email: "", username: "", phone: "", password: "" });
      fetch();
    } else toast.error(r.error);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Data Guru & Staf"
        description="Kelola akun guru di sekolah"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Guru</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Guru Baru</DialogTitle></DialogHeader>
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
                    <Label>Telepon</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Password *</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari guru..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           filtered.length === 0 ? <EmptyState icon={GraduationCap} title="Belum ada guru" /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow><TableHead>Guru</TableHead><TableHead>Email</TableHead><TableHead>Telepon</TableHead><TableHead>Penugasan</TableHead></TableRow>
               </TableHeader>
               <TableBody>
                 {filtered.map((t) => (
                   <TableRow key={t.id}>
                     <TableCell>
                       <div className="flex items-center gap-2">
                         <Avatar className="w-8 h-8"><AvatarFallback className="text-xs">{t.fullName.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                         <div><p className="font-medium">{t.fullName}</p><p className="text-xs text-muted-foreground">@{t.username}</p></div>
                       </div>
                     </TableCell>
                     <TableCell className="text-sm">{t.email}</TableCell>
                     <TableCell className="text-sm text-muted-foreground">{t.phone || "—"}</TableCell>
                     <TableCell><Badge variant="secondary">{t.assignmentCount} kelas/mapel</Badge></TableCell>
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
