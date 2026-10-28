# 🚀 Panduan Deployment: GitHub + Vercel + Supabase

Panduan lengkap untuk deploy **CBT Sekolah** dari repository lokal ke produksi menggunakan:
- **GitHub** untuk version control & hosting source code
- **Vercel** untuk hosting aplikasi Next.js (serverless, gratis untuk awal)
- **Supabase** untuk database PostgreSQL managed (gratis hingga 500MB)

---

## Arsitektur Setelah Deploy

```
┌──────────────────────────────────────────────────────┐
│  Browser User (HTTPS)                                │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────┐
│  Vercel (Next.js Serverless)                         │
│  - URL: https://[nama-proyek].vercel.app             │
│  - Auto-deploy dari GitHub main branch               │
│  - Edge Network CDN untuk static assets              │
│  - Serverless Functions untuk API routes             │
└────────────────┬─────────────────────────────────────┘
                 │ Prisma ORM (HTTPS)
                 ▼
┌──────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL Managed)                       │
│  - Connection Pooler (pgbouncer): port 6543          │
│  - Direct Connection: port 5432                      │
│  - Auto-backup harian                                │
│  - Dashboard admin di https://supabase.com/dashboard │
└──────────────────────────────────────────────────────┘
```

---

## Langkah 1: Persiapan Repository Lokal

### 1.1 Pastikan `.gitignore` sudah benar

File `.gitignore` sudah dikonfigurasi untuk mengabaikan:
- `.env` (semua variabel termasuk rahasia)
- `db/` (file SQLite lokal)
- `node_modules/`
- `.next/` (build artifacts)
- `dev.log`, `server.log`
- `.zscripts/` (sandbox-specific)

**Verifikasi tidak ada file sensitif yang akan di-commit:**
```bash
git status
# Pastikan .env TIDAK muncul di "Untracked files"
# Jika muncul, periksa .gitignore
```

### 1.2 Bersihkan file sandbox yang tidak relevan

```bash
# File-file ini hanya untuk sandbox Z.ai, tidak relevan di Vercel
# Mereka sudah di-gitignore, tapi pastikan tidak ter-commit
ls -la .zscripts/ tests/python-runtime-*.sh 2>/dev/null
# Jika ada, biarkan (sudah di-gitignore)
```

### 1.3 Commit awal

```bash
git init
git add .
git status  # review apa yang akan di-commit
git commit -m "feat: initial release — CBT Sekolah platform"
```

---

## Langkah 2: Setup Supabase Database

### 2.1 Buat project Supabase

1. Buka https://supabase.com → Sign up (gratis dengan GitHub)
2. Klik **New Project**
3. Isi:
   - **Name**: `cbt-sekolah-prod` (atau sesuai)
   - **Database Password**: Buat password kuat, **simpan di tempat aman** (password manager)
   - **Region**: Pilih terdekat dengan user (Singapore untuk Indonesia)
   - **Plan**: Free (cukup untuk awal)
4. Tunggu 2-3 menit hingga project siap

### 2.2 Dapatkan connection string

1. Buka project Supabase → **Settings** (gear icon) → **Database**
2. Cari bagian **Connection string**
3. Pilih tab **URI**
4. Salin connection string (format: `postgresql://postgres.[REF]:[PASSWORD]@...`)
5. Ganti `[YOUR-PASSWORD]` dengan password yang Anda buat di langkah 2.1

**Catatan**: Untuk Vercel serverless, gunakan **Connection Pooler URL** (port `6543`) untuk menghindari error "too many connections".

### 2.3 Update Prisma schema ke PostgreSQL

```bash
# Otomatis (rekomendasi): jalankan script setup
bash scripts/setup-supabase.sh

# Atau manual: edit prisma/schema.prisma
# Ubah baris: provider = "sqlite" → provider = "postgresql"
```

### 2.4 Set DATABASE_URL di .env lokal

```bash
# Edit file .env, ganti DATABASE_URL:
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### 2.5 Push schema ke Supabase

```bash
# Buat semua tabel di database
npx prisma db push --accept-data-loss

# Atau jika ingin migrasi terkontrol:
npx prisma migrate dev --name init
```

### 2.6 (Opsional) Seed data demo

```bash
# Hanya jika ingin data demo di Supabase
npx tsx scripts/seed.ts
```

---

## Langkah 3: Push ke GitHub

### 3.1 Buat repository GitHub

1. Buka https://github.com/new
2. **Repository name**: `cbt-sekolah`
3. **Visibility**: Private (rekomendasi untuk sekolah)
4. **Jangan** centang "Add README" (sudah ada)
5. Klik **Create repository**

### 3.2 Hubungkan & push

```bash
# Tambahkan remote GitHub
git remote add origin https://github.com/[USERNAME]/cbt-sekolah.git

# Push branch utama
git branch -M main
git push -u origin main
```

### 3.3 Verifikasi tidak ada rahasia ter-commit

```bash
# Cek history commit untuk file sensitif
git log --all --full-history -- .env
# Harus kosong (tidak ada commit .env)

# Scan rahasia yang mungkin ter-commit (opsional)
npx gitleaks detect --source . --no-banner
```

**Jika ada rahasia ter-commit secara tidak sengaja:**
1. **Segera rotate** rahasia tersebut (ganti password, regenerate secret)
2. Hapus dari history dengan `git filter-repo` atau BFG Repo-Cleaner
3. Force push: `git push --force`

---

## Langkah 4: Deploy ke Vercel

### 4.1 Import project ke Vercel

1. Buka https://vercel.com → Sign up / Sign in dengan GitHub
2. Klik **Add New...** → **Project**
3. Pilih repository `cbt-sekolah` dari daftar
4. Vercel akan auto-detect Next.js, klik **Configure Project**

### 4.2 Set Environment Variables

Di form "Environment Variables", tambahkan **semua** variabel berikut:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.[REF]:[PASSWORD]@...pooler.supabase.com:6543/postgres` | Production + Preview + Development |
| `NEXTAUTH_SECRET` | (generate dengan `openssl rand -base64 32`) | Production + Preview + Development |
| `NEXTAUTH_URL` | `https://[nama-proyek].vercel.app` (isi setelah dapat URL) | Production |
| `NEXTAUTH_URL` | `https://[preview-url].vercel.app` | Preview |
| `APP_DEFAULT_TIMEZONE` | `Asia/Jakarta` | All |
| `NEXT_PUBLIC_APP_NAME` | `CBT Sekolah` | All |

**Tips**:
- Untuk `NEXTAUTH_URL`, deploy dulu tanpa variabel ini, dapatkan URL Vercel, lalu edit Environment Variables.
- Atau set `NEXTAUTH_URL` kosong dulu — NextAuth akan otomatis pakai request host.

### 4.3 Deploy

1. Klik **Deploy**
2. Tunggu 2-3 menit (build + deploy)
3. Jika ada error, cek log di Vercel dashboard

### 4.4 Set NEXTAUTH_URL setelah deploy

Setelah dapat URL Vercel (mis. `https://cbt-sekolah.vercel.app`):
1. Vercel dashboard → project → **Settings** → **Environment Variables**
2. Update `NEXTAUTH_URL` ke URL tersebut
3. Trigger redeploy: **Deployments** → ⋮ → **Redeploy**

---

## Langkah 5: Verifikasi Deployment

### 5.1 Test login

Buka URL Vercel Anda, coba login dengan akun demo (jika Anda seed):
- `superadmin@cbt.demo` / `admin123`
- `admin@sekolah1.cbt` / `admin123`
- dll (lihat README.md)

### 5.2 Test API endpoint

```bash
curl https://[URL-VERCEL]/api/me
# Harus return: {"user":null}
```

### 5.3 Cek Supabase dashboard

1. Supabase → **Table Editor**
2. Pastikan 21 tabel sudah terbuat (schools, users, exams, dll.)
3. Cek tabel `AuditLog` — harus ada entry dari setup

### 5.4 Test alur lengkap

1. Login sebagai guru → buat soal di Bank Soal
2. Login sebagai siswa → kerjakan ujian
3. Login sebagai guru → cek Live Monitoring
4. Login sebagai pengawas → monitoring real-time

---

## Langkah 6: Setup Auto-Deploy dari GitHub

Vercel otomatis deploy setiap push ke `main` branch. Untuk workflow yang baik:

### 6.1 Branch strategy

- `main` → production (auto-deploy ke Vercel)
- `develop` → staging (preview deployment)
- `feature/*` → branch fitur baru

### 6.2 PR workflow

1. Buat branch: `git checkout -b feature/import-soal`
2. Commit perubahan: `git commit -m "feat: import soal dari Excel"`
3. Push: `git push origin feature/import-soal`
4. Buat Pull Request di GitHub
5. Vercel akan buat **Preview Deployment** otomatis
6. Review & merge → auto-deploy ke production

---

## Troubleshooting

### Error: "PrismaClientInitializationError: Can't reach database server"

**Penyebab**: Connection string salah, atau network Vercel tidak bisa reach Supabase.

**Solusi**:
1. Verifikasi `DATABASE_URL` di Vercel env vars (tanpa `[YOUR-PASSWORD]` placeholder)
2. Pastikan menggunakan **Connection Pooler URL** (port `6543`), bukan direct connection
3. Test koneksi dari lokal dengan env var yang sama

### Error: "too many connections" di Supabase

**Penyebab**: Vercel serverless buka banyak koneksi paralel.

**Solusi**:
1. Gunakan **Transaction mode** di Supabase pooler (bukan Session mode)
2. Tambah `?pgbouncer=true&connection_limit=1` ke `DATABASE_URL`
3. Upgrade Supabase ke plan Pro jika traffic tinggi

### Error: "NEXTAUTH_URL" warning

**Solusi**: Set `NEXTAUTH_URL` di Vercel env vars dengan URL lengkap (mis. `https://cbt-sekolah.vercel.app`).

### Error: Build timeout di Vercel

**Solusi**:
1. Pastikan `prisma generate` tidak lama (coba `bun add -D prisma@latest && bun install`)
2. Cek apakah ada import yang berat (mis. mammoth, xlsx) — sudah dioptimasi via dynamic import jika perlu
3. Upgrade ke Vercel Pro untuk build timeout lebih lama

### Error: "Cannot find module '@prisma/client'"

**Solusi**: Pastikan `postinstall` script jalan. Vercel log akan tampilkan:
```
Running "prisma generate"...
```

### Setelah deploy pertama, data demo tidak ada

**Solusi**: Seed manual ke Supabase:
```bash
# Set DATABASE_URL lokal ke Supabase URL
export DATABASE_URL="postgresql://..."

# Jalankan seed
npx tsx scripts/seed.ts
```

---

## Maintenance

### Backup database

Supabase free plan sudah include backup harian (7 hari retention). Untuk backup manual:
1. Supabase Dashboard → **Database** → **Backups**
2. Klik **Create backup**

### Update dependencies

```bash
# Cek outdated
bun outdated

# Update minor/patch
bun update

# Update major (hati-hati, bisa break)
bun add next@latest prisma@latest
```

### Rotate NEXTAUTH_SECRET

1. Generate secret baru: `openssl rand -base64 32`
2. Update di Vercel env vars
3. Redeploy
4. **Semua user akan auto-logout** (JWT lama tidak valid)

---

## Checklist Final Sebelum Go-Live

- [ ] `.env` TIDAK ter-commit ke GitHub (cek `git log --all --full-history -- .env`)
- [ ] `DATABASE_URL` di Vercel pakai Supabase Pooler URL (port 6543)
- [ ] `NEXTAUTH_SECRET` sudah di-generate (bukan default)
- [ ] `NEXTAUTH_URL` sesuai URL Vercel production
- [ ] Test login end-to-end di URL production
- [ ] Test flow siswa mengerjakan ujian di production
- [ ] Test monitoring guru di production
- [ ] Supabase dashboard menunjukkan koneksi aktif dari Vercel
- [ ] Setup custom domain (opsional, mis. `cbt.sekolahsaya.sch.id`)
- [ ] Backup database pertama setelah seed data
- [ ] Bagikan URL + kredensial demo kepada stakeholder

---

## Cost Estimate

| Layanan | Free Plan | Cukup untuk |
|---------|-----------|------------|
| Vercel Hobby | 100GB bandwidth/bulan, 100GB-hours serverless | ~1000 siswa aktif |
| Supabase Free | 500MB database, 50MB file storage, 50k MAU | 1 sekolah kecil |
| GitHub Public/Private | Unlimited private repos | — |

**Upgrade ke Pro** jika:
- Vercel: traffic > 100GB/bulan, butuh analytics, custom domain SSL otomatis
- Supabase: database > 500MB, butuh backup retensi > 7 hari, banyak concurrent connections

---

## Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Prisma Documentation**: https://pris.ly/d/prisma-schema
- **NextAuth v4 Docs**: https://next-auth.js.org/getting-started/introduction
- **Next.js 16 Deployment**: https://nextjs.org/docs/app/building-your-application/deploying
