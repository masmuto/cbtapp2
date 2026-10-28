# Checklist Keamanan — CBT Sekolah

> Wajib ditinjau sebelum deployment ke produksi.

## 1. Autentikasi & Sesi

- [x] Password di-hash dengan bcrypt (cost 10+)
- [x] Sesi JWT, expiry 8 jam
- [x] Login dengan identifier (email atau username)
- [x] Akun nonaktif tidak bisa login
- [x] Keanggotaan nonaktif tidak dihitung
- [ ] **TODO Produksi**: Aktifkan rate limiting di endpoint login (max 5 percobaan per menit per IP)
- [ ] **TODO Produksi**: Tambah CAPTCHA setelah 3 percobaan gagal
- [ ] **TODO Produksi**: Implementasi 2FA untuk admin & guru
- [ ] **TODO Produksi**: Rotasi NEXTAUTH_SECRET secara berkala

## 2. Otorisasi (RBAC)

- [x] Role tidak pernah dipercaya dari frontend — selalu divalidasi di server via `requireRole()`
- [x] `schoolId` tidak pernah dipercaya dari input klien — diambil dari sesi JWT
- [x] Akses lintas-sekolah ditolak via `requireSchoolScoped()`
- [x] Guru hanya bisa mengelola ujian miliknya (`assertExamOwner()`)
- [x] Pengawas hanya melihat ujian yang ditugaskan kepadanya
- [x] Siswa hanya melihat jawaban dari percobaannya sendiri
- [x] Nilai hanya bisa dibaca siswa setelah dipublikasi
- [x] Kunci jawaban (`isCorrect` di `QuestionOption`) tidak pernah diekspos ke API siswa
- [x] Pengumpulan, penilaian, publikasi hanya melalui endpoint tepercaya

## 3. Multi-tenant Isolation

- [x] Semua entitas milik sekolah memiliki `schoolId`
- [x] Setiap query di-filter berdasarkan `schoolId` dari sesi aktif
- [x] Tidak ada endpoint yang menerima `schoolId` dari body request
- [x] Superadmin bisa lintas sekolah, tetapi role lain dibatasi ke sekolah aktif

## 4. Mesin Ujian & Anti-Cheat

- [x] Soal diambil dari fungsi server (`/api/exams/{id}/attempts`) — tidak ada endpoint publik yang mengembalikan kunci jawaban
- [x] Snapshot soal per ujian — perubahan bank soal tidak mengubah sesi yang sedang berjalan
- [x] Timer berbasis server (`serverEndsAt`), tidak bergantung pada jam klien
- [x] Tenggat divalidasi ulang setiap kali jawaban diterima
- [x] Auto-submit jika tenggat terlewati
- [x] Satu sesi aktif per siswa per ujian (via unique constraint `examId_enrollmentId_attemptNo`)
- [x] Pengacakan soal & opsi konsisten per sesi (seed = attempt.id)
- [x] Pencatatan event: TAB_SWITCH, FULLSCREEN_EXIT, FOCUS_LOSS, HEARTBEAT
- [x] Heartbeat setiap 30 detik
- [x] Block copy-paste & context menu jika dikonfigurasi
- [x] Idempotensi pada autosave via `revision` number
- [x] Konfirmasi eksplisit sebelum pengumpulan
- [x] Tidak ada auto-hukuman berdasarkan skor risiko — hanya catatan untuk ditinjau guru

## 5. Penilaian & Publikasi

- [x] Skor objektif dihitung di server saat submit (transaction)
- [x] Idempotensi submit via status check di dalam transaction
- [x] Esai dinilai manual oleh guru (bukan siswa)
- [x] Riwayat revisi nilai dicatat (`GradeRevision`)
- [x] Publikasi nilai eksplisit oleh guru (`publishResults`)
- [x] Siswa hanya melihat nilai yang sudah `published`

## 6. Audit & Logging

- [x] Audit log untuk aksi kritis: CREATE_*, UPDATE_*, DELETE_*, PUBLISH_*, SUBMIT, GRADE
- [x] Audit log menyimpan actor, target, school, metadata, timestamp
- [x] Audit log read-only (tidak ada endpoint update/delete)
- [x] Superadmin bisa melihat semua log; admin sekolah hanya miliknya
- [x] Event ujian disimpan per attempt (`ExamEvent`)

## 7. Privacy & Data Protection

- [x] Tidak ada video/audio yang disimpan secara default
- [x] Tidak ada data sensitif di PWA cache (jawaban, kunci, token tidak di-cache)
- [x] Kamera tidak diaktifkan diam-diam (wajib minta izin eksplisit jika diimplementasi)
- [x] URL storage privat untuk asset (jika ditambahkan)
- [ ] **TODO Produksi**: Tentukan retensi data ujian (mis. hapus attempt > 2 tahun)
- [ ] **TODO Produksi**: Kebijakan delete akun siswa sesuai UU PDP Indonesia

## 8. Konfigurasi & Deployment

- [x] `.env.example` tanpa rahasia
- [x] `NEXTAUTH_SECRET` wajib diisi (bukan default)
- [x] Tidak ada `service_role` key di frontend
- [x] HTTPS wajib (Caddy sudah auto Let's Encrypt)
- [x] Security headers (HSTS, X-Frame-Options, X-Content-Type-Options) — verify di reverse proxy
- [ ] **TODO Produksi**: Aktifkan CSP (Content Security Policy) yang ketat
- [ ] **TODO Produksi**: Setup monitoring error (Sentry / similar)
- [ ] **TODO Produksi**: Backup database otomatis harian
- [ ] **TODO Produksi**: Setup health check endpoint

## 9. Pengujian Keamanan Negatif

Skenario yang sudah diverifikasi ditolak:
- [x] Siswa mencoba akses ujian dari sekolah lain → 403
- [x] Siswa mencoba akses attempt siswa lain → 403
- [x] Siswa mencoba baca kunci jawaban via API → tidak ada endpoint yang mengembalikan `isCorrect`
- [x] Guru A mencoba edit ujian milik Guru B → 403
- [x] Siswa mencoba submit kedua kali → 409
- [x] Autosave dengan revision lama (out-of-order) → ditolak dengan alasan `stale_revision`
- [x] Submit tanpa konfirmasi → 400
- [x] Akses attempt yang sudah submit untuk diubah → 409
- [x] JWT invalid → 401

## 10. Performance & Skalabilitas

- [x] Pagination di audit log (limit/offset)
- [x] Indeks database pada kolom yang sering di-query (`schoolId`, `examId`, `enrollmentId`, `createdAt`)
- [x] Snapshot soal disimpan sebagai JSON untuk query cepat
- [ ] **TODO Produksi**: Connection pooling (PgBouncer / Prisma Accelerate)
- [ ] **TODO Produksi**: CDN untuk asset statis
- [ ] **TODO Produksi**: Caching layer untuk data read-only (mata pelajaran, kelas)

---

## Catatan Penting

1. **Tidak ada sistem yang 100% anti-curang** di browser biasa. Dokumentasikan batasan ini kepada sekolah.
2. **Kebijakan anti-curang** harus melibatkan aspek manusia: pengawasan fisik, aturan sekolah, dan peninjauan manual insiden.
3. **Skor risiko** hanya alat bantu, bukan vonis. Siswa berhak atas klarifikasi.
4. **Backup teratur** sangat penting — SQLite tidak replikasi otomatis.
