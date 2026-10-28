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
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";

export function SubjectsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", level: "SMP" });

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/subjects").then((r) => {
      if (r.ok) setItems(r.data?.subjects || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/subjects", { method: "POST", body: JSON.stringify(form) });
    if (r.ok) {
      toast.success("Mapel berhasil dibuat.");
      setOpen(false);
      setForm({ code: "", name: "", level: "SMP" });
      fetch();
    } else toast.error(r.error);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mata Pelajaran"
        description="Kelola daftar mata pelajaran sekolah"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Mapel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah Mata Pelajaran</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kode *</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MTK" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jenjang</Label>
                    <select className="w-full px-3 py-2 border rounded-md text-sm" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                      <option>SD</option><option>SMP</option><option>SMA</option><option>SMK</option><option>MTs</option><option>MA</option><option>PESANTREN</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Mata Pelajaran *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Matematika" required />
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
          {loading ? <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div> :
           items.length === 0 ? <EmptyState icon={BookOpen} title="Belum ada mapel" /> :
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow><TableHead>Kode</TableHead><TableHead>Nama</TableHead><TableHead>Jenjang</TableHead></TableRow>
               </TableHeader>
               <TableBody>
                 {items.map((s) => (
                   <TableRow key={s.id}>
                     <TableCell><Badge variant="secondary">{s.code}</Badge></TableCell>
                     <TableCell className="font-medium">{s.name}</TableCell>
                     <TableCell className="text-muted-foreground">{s.level || "—"}</TableCell>
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
