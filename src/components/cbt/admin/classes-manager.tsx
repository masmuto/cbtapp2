"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { School, Plus, Users, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export function ClassesManager() {
  const [items, setItems] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", academicYearId: "", homeroomTeacherId: "", capacity: 36 });

  const fetch = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/classes"),
      apiFetch("/api/teachers"),
      apiFetch("/api/academic-years"),
    ]).then(([c, t, a]) => {
      if (c.ok) setItems(c.data?.classes || []);
      if (t.ok) setTeachers(t.data?.teachers || []);
      if (a.ok) {
        setAcademicYears(a.data?.academicYears || []);
        if (!form.academicYearId && a.data?.academicYears?.length > 0) {
          const active = a.data.academicYears.find((y: any) => y.isActive) || a.data.academicYears[0];
          setForm((f) => ({ ...f, academicYearId: active.id }));
        }
      }
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.academicYearId) {
      toast.error("Nama kelas dan tahun ajaran wajib diisi.");
      return;
    }
    const r = await apiFetch("/api/classes", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (r.ok) {
      toast.success("Kelas berhasil dibuat.");
      setOpen(false);
      setForm({ name: "", academicYearId: form.academicYearId, homeroomTeacherId: "", capacity: 36 });
      fetch();
    } else {
      toast.error(r.error || "Gagal.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kelas & Rombongan Belajar"
        description="Kelola kelas dan walikelas"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah Kelas</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Kelas Baru</DialogTitle>
                <DialogDescription>Buat rombongan belajar baru.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nama Kelas *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: 7A, X IPA 1" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Tahun Ajaran *</Label>
                  <Select value={form.academicYearId} onValueChange={(v) => setForm({ ...form, academicYearId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.name} {y.semester} {y.isActive && "(Aktif)"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Wali Kelas</Label>
                  <Select value={form.homeroomTeacherId} onValueChange={(v) => setForm({ ...form, homeroomTeacherId: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih guru (opsional)" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kapasitas</Label>
                  <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 36 })} />
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
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div>
          ) : items.length === 0 ? (
            <EmptyState icon={School} title="Belum ada kelas" description="Tambahkan kelas pertama Anda." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Wali Kelas</TableHead>
                    <TableHead>Siswa</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Kapasitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.homeroom?.fullName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary"><Users className="w-3 h-3 mr-1" />{c._count?.enrollments || 0}</Badge>
                      </TableCell>
                      <TableCell>{c._count?.subjects || 0}</TableCell>
                      <TableCell className="text-muted-foreground">{c.capacity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
