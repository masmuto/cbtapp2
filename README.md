# CBT Sekolah

Platform **Computer Based Test** online untuk semua jenjang pendidikan Indonesia: SD/MI, SMP/MTs, SMA/MA, SMK, dan pesantren. Aman, multi-sekolah, dan responsif — dilengkapi anti-menyontek berlapis, autosave, dan penilaian otomatis.

> **Catatan stack**: Aplikasi ini diadaptasi dari spesifikasi awal berbasis Supabase ke lingkungan Next.js + Prisma + SQLite. Pola arsitektur tetap sama: multi-tenant via `schoolId`, RBAC di lapisan aplikasi, audit log, validasi server, dan isolasi data. Migrasi ke PostgreSQL/MySQL atau Supabase dapat dilakukan dengan mengubah `datasource` di `prisma/schema.prisma`.

---

## Fitur Utama

- **Multi-sekolah & multi-peran**: superadmin, school_admin, teacher, proctor, student. Satu akun dapat memiliki beberapa keanggotaan sekolah.
- **Bank soal lengkap**: pilihan ganda, pilihan ganda kompleks, benar/salah, isian singkat, esai, dengan kategori, tag, tingkat kesulitan, dan bobot.
- **Penyusunan ujian**: pilih soal dari bank, atur jadwal, durasi, percobaan, pengacakan soal & opsi, navigasi, dan kebijakan anti-menyontek.
- **Mesin ujian siswa**: timer berbasis server, autosave dengan idempotensi revision, navigasi nomor soal, indikator sync, pemulihan sesi, anti-cheat (deteksi tab switch, fullscreen exit, focus loss, block copy-paste), heartbeat, dan konfirmasi pengumpulan.
- **Penilaian otomatis + manual**: skor otomatis untuk soal objektif, koreksi esai manual dengan rubrik dan komentar, riwayat revisi nilai.
- **Publikasi nilai**: siswa hanya melihat nilai yang sudah dipublikasi oleh guru.
- **Monitoring pengawas**: daftar peserta, status sesi real-time, insiden, catatan pengawas. Pengawas **tidak** melihat kunci jawaban.
- **Audit log**: setiap aksi kritis tercatat dengan aktor, target, dan metadata.
- **PWA**: installable, manifest, ikon, viewport adaptif.
- **Responsif**: sidebar di desktop, bottom navigation di mobile.

---

## Arsitektur

```
┌──────────────────────────────────────────────────────────────┐
│                      Browser (PWA)                            │
│  SPA di route "/" — state-based view switching               │
│  AppShell (sidebar/bottom-nav) + Exam Runner (fullscreen)    │
└────────────┬─────────────────────────────────────────────────┘
             │ HTTPS (relative paths only)
┌────────────▼─────────────────────────────────────────────────┐
│              Next.js 16 App Router (Port 3000)               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │  Page: / (SPA entry)    │  │  API Routes /api/*       │  │
│  │  - Auth gate            │  │  - /api/auth/[...next]   │  │
│  │  - Role-based render    │  │  - /api/me, /api/stats   │  │
│  │  - View switching       │  │  - /api/schools, classes │  │
│  └─────────────────────────┘  │  - /api/teachers, stds  │  │
│                               │  - /api/question-banks  │  │
│                               │  - /api/questions        │  │
│                               │  - /api/exams/[id]/...   │  │
│                               │  - /api/attempts, answers│  │
│                               │  - /api/grade, proctoring│ │
│                               │  - /api/audit             │ │
│                               └────────────┬─────────────┘  │
└────────────────────────────────────────────┬─────────────────┘
                                             │
                          ┌──────────────────▼─────────────────┐
                          │  Prisma ORM (TypeScript)          │
                          │  - schema.prisma (multi-tenant)   │
                          │  - RBAC helpers (lib/rbac.ts)      │
                          │  - Audit logger                    │
                          └──────────────────┬─────────────────┘
                                             │
                          ┌──────────────────▼─────────────────┐
                          │  SQLite (file: db/custom.db)      │
                          │  - 21 tabel terisolasi via schoolId│
                          └───────────────────────────────────┘
```

---

## Struktur Folder

```
.
├── prisma/
│   └── schema.prisma           # Skema database (21 model multi-tenant)
├── public/
│   ├── icon.svg                 # Ikon PWA
│   └── manifest.webmanifest     # PWA manifest
├── scripts/
│   └── seed.ts                  # Seed data demo
├── src/
│   ├── app/
│   │   ├── api/                 # API routes (RESTful)
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── me, stats, audit, schools
│   │   │   ├── academic-years, classes, subjects
│   │   │   ├── teachers, students
│   │   │   ├── question-banks, questions
│   │   │   ├── exams/[id]/...   # GET ujian, POST/PATCH update
│   │   │   │   ├── questions/   # CRUD soal di ujian
│   │   │   │   ├── publish/     # Publikasi ujian
│   │   │   │   ├── attempts/    # GET sesi + POST submit
│   │   │   │   └── results/     # Hasil ujian
│   │   │   ├── exam-assignments/
│   │   │   ├── answers/         # Autosave jawaban (idempotent)
│   │   │   ├── events/          # Catat event anti-cheat
│   │   │   ├── grade/[id]/      # Grading esai
│   │   │   ├── grade/publish/   # Publikasi hasil
│   │   │   └── proctoring/      # Monitoring pengawas
│   │   ├── globals.css
│   │   ├── layout.tsx           # Root layout + metadata + PWA
│   │   └── page.tsx             # SPA entry (auth gate + view switch)
│   ├── components/
│   │   ├── providers.tsx        # NextAuth SessionProvider
│   │   ├── ui/                  # shadcn/ui components
│   │   └── cbt/
│   │       ├── auth/login-form.tsx
│   │       ├── layout/app-shell.tsx       # Sidebar + bottom nav + topbar
│   │       ├── shared/                    # StatCard, EmptyState, PageHeader, StatusBadge
│   │       ├── admin/                     # Dashboard + 8 manager views
│   │       ├── teacher/                   # Dashboard + 5 views
│   │       ├── proctor/                   # Dashboard + monitoring
│   │       └── student/                   # Dashboard + exam-runner + results
│   ├── hooks/                             # use-mobile, use-toast
│   ├── lib/
│   │   ├── auth.ts              # NextAuth config (Credentials + JWT)
│   │   ├── rbac.ts              # requireRole, requireSchoolScoped, assertExamOwner, audit
│   │   ├── api.ts               # Response helpers (ok, err, handleAuthError)
│   │   ├── client-api.ts        # apiFetch untuk client
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── helpers.ts           # hashPassword, seededShuffle, formatDate, dll.
│   │   ├── types.ts             # Shared TypeScript types
│   │   └── utils.ts             # cn() helper
│   └── stores/
│       └── app-store.ts         # Zustand: user, view, viewParams, navigate
├── .env.example
├── Caddyfile                    # Reverse proxy config
├── package.json
└── README.md (file ini)
```

---

## Instalasi Lokal

### Prasyarat
- Node.js 20+ / Bun 1.0+
- SQLite (sudah include di Node)

### Langkah

```bash
# 1. Clone & install dependencies
git clone <repo-url>
cd cbt-sekolah
bun install  # atau npm install

# 2. Setup environment
cp .env.example .env
# Edit .env, terutama NEXTAUTH_SECRET (generate: openssl rand -base64 32)

# 3. Push skema database
bun run db:push

# 4. Seed data demo
bun run db:seed

# 5. Jalankan dev server
bun run dev
# Buka http://localhost:3000
```

### Akun Demo

Setelah seed, gunakan akun berikut (password sama tertera):

| Peran | Email | Password |
|-------|-------|----------|
| Super Admin | superadmin@cbt.demo | admin123 |
| Admin Sekolah | admin@sekolah1.cbt | admin123 |
| Guru MTK | guru@sekolah1.cbt | guru123 |
| Guru IPA | guru2@sekolah1.cbt | guru123 |
| Pengawas | pengawas@sekolah1.cbt | awas123 |
| Siswa 7A | siswa1@sekolah1.cbt | siswa123 |
| Siswa 7B | siswa4@sekolah1.cbt | siswa123 |

> **Jangan gunakan di produksi**. Buat akun baru via admin UI.

---

## Skenario Pengujian Cepat

### Skenario 1: Siswa Mengerjakan Ujian
1. Login sebagai `siswa1@sekolah1.cbt` / `siswa123`.
2. Dashboard menampilkan ujian "Ulangan Harian Matematika".
3. Klik **Mulai Ujian**.
4. Halaman ujian fullscreen muncul: timer, soal, navigator.
5. Pilih jawaban, indikator "Tersimpan" muncul.
6. Beralih tab → peringatan muncul, insiden tercatat.
7. Klik **Kumpulkan** → konfirmasi → submit.

### Skenario 2: Guru Membuat Ujian
1. Login sebagai `guru@sekolah1.cbt` / `guru123`.
2. Buka **Bank Soal** → buat bank → tambah soal.
3. Buka **Ujian** → buat ujian baru (draft).
4. Klik **Kelola** → tambahkan soal dari bank.
5. Tugaskan ke kelas + pengawas.
6. Klik **Publikasikan**.

### Skenario 3: Pengawas Monitoring
1. Login sebagai `pengawas@sekolah1.cbt` / `awas123`.
2. Buka **Monitoring**.
3. Lihat daftar sesi siswa yang sedang berjalan.
4. Klik **Detail** untuk riwayat insiden.
5. Tambah catatan pengawas jika perlu.

### Skenario 4: Koreksi Esai & Publikasi
1. Login sebagai guru.
2. Buka **Koreksi** → pilih ujian.
3. Pilih siswa → beri nilai esai + komentar.
4. Setelah semua dinilai → klik **Publikasi**.
5. Login sebagai siswa → **Nilai Saya** untuk lihat hasil.

---

## Deployment

### Opsi 1: Vercel (Recommended)
```bash
vercel
# Set env vars di dashboard Vercel
# Ganti DATABASE_URL dengan PostgreSQL connection string
```

### Opsi 2: Self-hosted dengan Docker
```bash
# Build standalone
bun run build

# Run production
bun run start
```

### Opsi 3: VPS dengan Caddy (sudah dikonfigurasi)
- Caddyfile sudah disetup sebagai reverse proxy ke port 3000.
- Auto HTTPS via Let's Encrypt.

### Migrasi ke PostgreSQL/MySQL
1. Edit `prisma/schema.prisma` → ubah `provider` di `datasource`.
2. Update `DATABASE_URL` di `.env`.
3. Jalankan `bun run db:push` (untuk dev) atau `bun run db:migrate` (untuk produksi).

### Migrasi ke Supabase
1. Buat proyek Supabase.
2. Ambil connection string PostgreSQL dari Supabase.
3. Set `DATABASE_URL` ke connection string tersebut.
4. Jalankan `bun run db:push`.
5. (Opsional) Aktifkan RLS di Supabase dan tambahkan policy sesuai pola yang sudah ada di `lib/rbac.ts`.

---

## Checklist Keamanan Sebelum Produksi

Lihat file terpisah: **[SECURITY.md](./SECURITY.md)**.

---

## Keterbatasan Browser & Perangkat

| Keterbatasan | Dampak | Mitigasi |
|---|---|---|
| JavaScript bisa dimatikan | Anti-cheat client-side tidak berfungsi | Validasi server tetap berjalan; bawa pesan "JavaScript wajib" |
| Browser tidak mendukung fullscreen | Deteksi fullscreen exit tidak akurat | Fallback ke warning visual saja |
| Jam lokal bisa diubah | Tidak mempengaruhi timer (server-based) | Server yang menentukan tenggat |
| Tab switching bukan bukti pasti menyontek | False positive bisa terjadi | Hanya catat insiden, bukan auto-hukum |
| Kamera tidak bisa diam-diam | Privacy concern | Wajib minta izin eksplisit |
| Mobile keyboard bisa trigger focus loss | False event FOCUS_LOSS | Filter event saat keyboard muncul |
| Connection putus bisa terjadi | Jawaban tidak tersinkron | Antrean lokal + indikator offline |
| Secure browser tidak tersedia umum | Tidak ada lockdown penuh | Dokumentasikan kebijakan & rekomendasi secure browser |

---

## Roadmap Pengembangan

- [ ] Integrasi kamera proctoring (dengan izin eksplisit)
- [ ] Secure browser mode untuk perangkat terkelola
- [ ] Deteksi pola jawaban serupa (clustering)
- [ ] Import soal dari Excel/CSV dengan template
- [ ] Export PDF hasil ujian (per siswa & per kelas)
- [ ] Multi-language (ID/EN)
- [ ] Dark mode toggle
- [ ] Notifikasi push untuk pengawas
- [ ] Offline mode terkontrol dengan enkripsi

---

## Lisensi

MIT License — bebas digunakan untuk sekolah dan institusi pendidikan.

---

## Kontribusi

Pull request dipersilakan. Untuk perubahan besar, buka issue terlebih dahulu untuk diskusi.
