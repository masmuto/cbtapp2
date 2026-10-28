"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "superadmin@cbt.demo", password: "admin123" },
  { label: "Admin Sekolah", email: "admin@sekolah1.cbt", password: "admin123" },
  { label: "Guru MTK", email: "guru@sekolah1.cbt", password: "guru123" },
  { label: "Guru IPA", email: "guru2@sekolah1.cbt", password: "guru123" },
  { label: "Pengawas", email: "pengawas@sekolah1.cbt", password: "awas123" },
  { label: "Siswa 7A", email: "siswa1@sekolah1.cbt", password: "siswa123" },
  { label: "Siswa 7B", email: "siswa4@sekolah1.cbt", password: "siswa123" },
];

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Email/username dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Email/username atau password tidak valid.");
        setLoading(false);
        return;
      }
      toast.success("Berhasil masuk. Memuat data sesi...");
      onSuccess?.();
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      setError("Terjadi kesalahan. Coba lagi.");
      setLoading(false);
    }
  };

  const quickFill = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIdentifier(acc.email);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:flex-1 bg-gradient-to-br from-[#0f2540] via-[#1a3a5c] to-[#2c5f8c] text-white flex items-center justify-center p-8 lg:p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-cyan-300 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-teal-200 blur-3xl" />
        </div>
        <div className="relative max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              <GraduationCap className="w-8 h-8 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CBT Sekolah</h1>
              <p className="text-xs text-cyan-200/80 uppercase tracking-wider">Computer Based Test</p>
            </div>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
            Platform Ujian Online untuk Semua Jenjang Pendidikan Indonesia
          </h2>
          <p className="text-cyan-100/90 text-sm lg:text-base leading-relaxed mb-8">
            SD/MI, SMP/MTs, SMA/MA, SMK, dan Pesantren. Aman, multi-sekolah, dan responsif — dilengkapi
            anti-menyontek berlapis, autosave, dan penilaian otomatis.
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { icon: ShieldCheck, label: "Anti-Menyontek Berlapis" },
              { icon: GraduationCap, label: "Multi Peran & Sekolah" },
              { icon: Eye, label: "Monitoring Pengawas" },
              { icon: LogIn, label: "Autosave & Pemulihan Sesi" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-2 text-cyan-100">
                  <Icon className="w-4 h-4 text-cyan-300 shrink-0" />
                  <span className="text-xs lg:text-sm">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="lg:flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Masuk ke Akun</CardTitle>
              <CardDescription>
                Gunakan email/username dan password yang diberikan sekolah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email atau Username</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="cth: guru@sekolah1.cbt atau guru.mtk"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? "Sembunyikan" : "Tampilkan"}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Masuk
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground font-medium">Akun Demo (klik untuk isi otomatis):</p>
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => quickFill(acc)}
                    className="text-left px-2 py-1.5 rounded-md text-xs border border-border hover:bg-muted hover:border-primary/30 transition-colors"
                  >
                    <p className="font-medium truncate">{acc.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{acc.email}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                Catatan: data demo tidak untuk produksi.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
