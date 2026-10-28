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
import { Building2, Plus, Search, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

const LEVELS = ["SD", "SMP", "SMA", "SMK", "MTs", "MA", "PESANTREN"];

export function SchoolsManager() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", level: "SMP", address: "", city: "", province: "", timezone: "Asia/Jakarta" });
  const [submitting, setSubmitting] = useState(false);

  const fetch = () => {
    setLoading(true);
    apiFetch("/api/schools").then((r) => {
      if (r.ok) setSchools(r.data?.schools || []);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const filtered = schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.level) {
      toast.error("Kode, nama, dan jenjang wajib diisi.");
      return;
    }
    setSubmitting(true);
    const r = await apiFetch("/api/schools", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success("Sekolah berhasil dibuat.");
      setOpen(false);
      setForm({ code: "", name: "", level: "SMP", address: "", city: "", province: "", timezone: "Asia/Jakarta" });
      fetch();
    } else {
      toast.error(r.error || "Gagal membuat sekolah.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manajemen Sekolah"
        description="Kelola seluruh sekolah di platform (Super Admin)"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Sekolah Baru</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Sekolah Baru</DialogTitle>
                <DialogDescription>Lengkapi data sekolah. Kode sekolah harus unik.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kode Sekolah *</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="cth: SMP01" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jenjang *</Label>
                    <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Sekolah *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: SMP Negeri 1 Nusantara" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Alamat</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Jl. ..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Kota</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Provinsi</Label>
                    <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Timezone</Label>
                  <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? "Menyimpan..." : "Simpan"}</Button>
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
              <Input placeholder="Cari sekolah..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Memuat...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Building2} title="Belum ada sekolah" description="Tambahkan sekolah pertama Anda." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jenjang</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Badge variant="secondary">{s.code}</Badge></TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.level}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.city || "—"}, {s.province || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "Aktif" : "Nonaktif"}</Badge>
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
