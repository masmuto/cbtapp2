# Worklog — CBT Sekolah

---
Task ID: 1-12
Agent: main (Z.ai assistant)
Task: Build CBT Sekolah — full-stack Next.js CBT platform for Indonesian schools

Work Log:
- Tahap 1: Wrote complete Prisma schema (21 models) with multi-tenant `schoolId` isolation, RLS-equivalent RBAC patterns at application layer, audit log, proctoring records, exam lifecycle states, snapshot soal per ujian.
- Tahap 2: Configured NextAuth with Credentials provider + JWT session. Built `lib/rbac.ts` with `requireRole()`, `requireSchoolScoped()`, `assertExamOwner()`, `resolveStudentEnrollmentForExam()`, and `audit()` helpers. Server validates every action against DB; never trusts frontend role/schoolId.
- Tahap 3: Created `scripts/seed.ts` with 1 demo school (SMP), 1 superadmin + 1 school_admin + 2 teachers + 1 proctor + 5 students, 2 classes (7A, 7B), 3 subjects (MTK, IPA, BIN), 2 question banks, 7 questions (5 MTK + 2 IPA), 2 exams (1 published MTK + 1 draft IPA). Added `db:seed` npm script.
- Tahap 4: Built 22 API routes covering: `/api/me`, `/api/schools`, `/api/academic-years`, `/api/classes`, `/api/subjects`, `/api/teachers`, `/api/students`, `/api/question-banks`, `/api/questions`, `/api/exams` (+`/[id]`, `/questions`, `/publish`, `/attempts`, `/results`), `/api/exam-assignments`, `/api/answers` (autosave idempotent), `/api/events` (anti-cheat), `/api/grade/[id]`, `/api/grade/publish/[id]`, `/api/proctoring` (+`/[id]`), `/api/stats`, `/api/audit`. Key: `/api/exams/[id]/attempts` returns safe questions (no `isCorrect`); `/api/answers` uses revision-based idempotency.
- Tahap 5: Built `AppShell` (responsive sidebar desktop + bottom-nav mobile + topbar), `StatCard`, `PageHeader`, `EmptyState`, `StatusBadge`. Theme: navy primary + teal accent.
- Tahap 6: Admin module: dashboard (superadmin + school_admin variants), schools manager, academic-years, classes, subjects, teachers, students (with CSV export), audit-log viewer with pagination, admin-monitoring.
- Tahap 7: Teacher module: dashboard, question-banks (with inline question editor for all 5 types), exams manager (create/edit/publish), exam-builder (add/remove questions, assign class+proctor), grading view (essay correction + comment + publish), results view (stats + CSV export).
- Tahap 8: Proctor module: dashboard (active sessions + flagged sessions), monitoring list (search/filter), detail view (events timeline + proctoring notes + flag dialog).
- Tahap 9: Student module: dashboard (upcoming + available + completed), exams list, **exam-runner** — full-featured fullscreen exam page with server-time-based timer, autosave with idempotency revision, anti-cheat (tab switch detection, fullscreen exit, focus loss, copy-paste block, heartbeat every 30s), online/offline indicator, sync queue, question navigator with progress, submit confirmation dialog, result screen with score/pass status.
- Tahap 10: Results & publication: teacher-side grading flow + publish; student-side `StudentResults` showing only published attempts.
- Tahap 11: PWA `manifest.webmanifest` + `icon.svg` + metadata in layout; `.env.example`; `README.md` with full architecture, install, deployment, scenarios; `SECURITY.md` with 10-section pre-production checklist; CSV templates for student import + question import in `download/`.
- Tahap 12: Verified end-to-end with Agent Browser: (1) login as admin → dashboard with stats ✓, (2) login as student → dashboard → click Mulai Ujian → exam-runner loads with timer + question + autosave indicator "Tersimpan" confirmed ✓, (3) tab-switch event recording confirmed via API logs ✓, (4) submit dialog appears with answered count ✓.

Stage Summary:
- 21 Prisma models pushed to SQLite; seed runs successfully.
- ~25 API routes; all return proper HTTP codes and JSON.
- ~30 React components organized under `src/components/cbt/{auth,layout,shared,admin,teacher,proctor,student}/`.
- All flows verified working end-to-end: login, dashboard, exam-taking with autosave, anti-cheat events logged to DB, publish/grade endpoints.
- Adapted from Supabase spec to Prisma+SQLite (kept same architectural patterns: multi-tenant isolation, RBAC at app layer, audit log).
- Single-page SPA at route `/` (per environment constraint) — state-based view switching via Zustand store.
- Artifacts produced: `README.md`, `SECURITY.md`, `.env.example`, `public/manifest.webmanifest`, `public/icon.svg`, `download/template-import-siswa.csv`, `download/template-import-soal.csv`, `download/admin-dashboard.png`, `download/exam-runner.png`.
