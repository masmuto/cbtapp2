"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { PageHeader, EmptyState } from "@/components/cbt/shared/common";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Plus, Edit, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDateID } from "@/lib/helpers";

export function AcademicYearsManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "2025/2026", semester: "GANJIL", isActive: true, startDate: "", endDate: "" });

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/academic-years").then((r) => {
      if (r.ok) setItems(r.data?.academicYears || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await apiFetch("/api/academic-years", {
      method: "POST",
      body: JSON.stringify({
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }),
    });
    if (r.ok) {
      toast.success("Tahun ajaran berhasil dibuat.");
      setOpen(false);
      fetch();
    } else {
      toast.error(r.error || "Gagal membuat.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tahun Ajaran & Semester"
        description="Kelola periode akademik sekolah"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Tambah</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Tahun Ajaran</DialogTitle>
                <DialogDescription>Buat tahun ajaran baru. Hanya satu yang bisa aktif.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nama Tahun Ajaran</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: 2025/2026" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Semester</Label>
                    <select className="w-full px-3 py-2 border rounded-md text-sm" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                      <option value="GANJIL">Ganjil</option>
                      <option value="GENAP">Genap</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Set Aktif?</Label>
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                      <span className="text-sm">{form.isActive ? "Ya" : "Tidak"}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tanggal Mulai</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tanggal Selesai</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div>
          ) : items.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Belum ada tahun ajaran" description="Tambahkan tahun ajaran pertama Anda." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((ay) => (
                    <TableRow key={ay.id}>
                      <TableCell className="font-medium">{ay.name}</TableCell>
                      <TableCell><Badge variant="outline">{ay.semester}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateID(ay.startDate)} - {formatDateID(ay.endDate)}
                      </TableCell>
                      <TableCell>
                        {ay.isActive ? (
                          <Badge className="bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" /> Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
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
