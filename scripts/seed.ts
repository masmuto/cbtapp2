// Seed data demo untuk CBT Sekolah
// Membuat 1 sekolah demo, beberapa akun per peran, kelas, mapel, bank soal, ujian.
//
// Jalankan: bun run db:seed
//
// Kredensial demo (TIDAK untuk produksi):
//   superadmin@cbt.demo   / admin123
//   admin@sekolah1.cbt    / admin123  (school_admin)
//   guru@sekolah1.cbt     / guru123   (teacher — Matematika)
//   guru2@sekolah1.cbt    / guru123   (teacher — IPA)
//   pengawas@sekolah1.cbt / awas123   (proctor)
//   siswa1@sekolah1.cbt   / siswa123 (student kelas 7A)
//   siswa2@sekolah1.cbt   / siswa123 (student kelas 7A)
//   siswa3@sekolah1.cbt   / siswa123 (student kelas 7B)
//
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/helpers";

async function main() {
  console.log("🧹 Membersihkan data lama...");
  await db.auditLog.deleteMany();
  await db.proctoringRecord.deleteMany();
  await db.examEvent.deleteMany();
  await db.attemptAnswer.deleteMany();
  await db.examAttempt.deleteMany();
  await db.examAssignment.deleteMany();
  await db.examQuestion.deleteMany();
  await db.questionOption.deleteMany();
  await db.question.deleteMany();
  await db.questionBank.deleteMany();
  await db.classSubject.deleteMany();
  await db.studentEnrollment.deleteMany();
  await db.class.deleteMany();
  await db.subject.deleteMany();
  await db.academicYear.deleteMany();
  await db.schoolMembership.deleteMany();
  await db.school.deleteMany();
  await db.user.deleteMany();

  console.log("🏫 Membuat sekolah demo...");
  const school = await db.school.create({
    data: {
      code: "SMP01",
      name: "SMP Negeri 1 Nusantara",
      level: "SMP",
      address: "Jl. Pendidikan No. 1",
      city: "Jakarta",
      province: "DKI Jakarta",
      timezone: "Asia/Jakarta",
      isActive: true,
    },
  });

  // ============ USER ============
  const pwSuper = await hashPassword("admin123");
  const pwAdmin = await hashPassword("admin123");
  const pwGuru = await hashPassword("guru123");
  const pwAwas = await hashPassword("awas123");
  const pwSiswa = await hashPassword("siswa123");

  const superadmin = await db.user.create({
    data: {
      email: "superadmin@cbt.demo",
      username: "superadmin",
      passwordHash: pwSuper,
      fullName: "Super Admin Platform",
      isSuperadmin: true,
      isActive: true,
    },
  });

  const admin = await db.user.create({
    data: {
      email: "admin@sekolah1.cbt",
      username: "admin.sekolah1",
      passwordHash: pwAdmin,
      fullName: "Budi Santoso (Admin Sekolah)",
      isActive: true,
      memberships: { create: [{ schoolId: school.id, role: "school_admin" }] },
    },
  });

  const guru = await db.user.create({
    data: {
      email: "guru@sekolah1.cbt",
      username: "guru.mtk",
      passwordHash: pwGuru,
      fullName: "Siti Aminah, S.Pd",
      phone: "081200011122",
      isActive: true,
      memberships: { create: [{ schoolId: school.id, role: "teacher" }] },
    },
  });

  const guru2 = await db.user.create({
    data: {
      email: "guru2@sekolah1.cbt",
      username: "guru.ipa",
      passwordHash: pwGuru,
      fullName: "Ahmad Fauzi, S.Pd",
      isActive: true,
      memberships: { create: [{ schoolId: school.id, role: "teacher" }] },
    },
  });

  const proctor = await db.user.create({
    data: {
      email: "pengawas@sekolah1.cbt",
      username: "pengawas01",
      passwordHash: pwAwas,
      fullName: "Dewi Lestari (Pengawas)",
      isActive: true,
      memberships: { create: [{ schoolId: school.id, role: "proctor" }] },
    },
  });

  // 5 siswa demo
  const siswaList: { user: any; kelasLetter: string; nis: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const kelasLetter = i <= 3 ? "7A" : "7B";
    const nis = `2025${String(i).padStart(4, "0")}`;
    const s = await db.user.create({
      data: {
        email: `siswa${i}@sekolah1.cbt`,
        username: `siswa.${nis}`,
        passwordHash: pwSiswa,
        fullName: `Siswa Demo ${i}`,
        isActive: true,
        memberships: { create: [{ schoolId: school.id, role: "student" }] },
      },
    });
    siswaList.push({ user: s, kelasLetter, nis });
  }

  // ============ AKADEMIK ============
  const ay = await db.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2025/2026",
      semester: "GANJIL",
      isActive: true,
      startDate: new Date("2025-07-15"),
      endDate: new Date("2025-12-20"),
    },
  });

  const class7A = await db.class.create({
    data: {
      schoolId: school.id,
      academicYearId: ay.id,
      name: "7A",
      homeroomTeacherId: guru.id,
      capacity: 36,
    },
  });
  const class7B = await db.class.create({
    data: {
      schoolId: school.id,
      academicYearId: ay.id,
      name: "7B",
      homeroomTeacherId: guru2.id,
      capacity: 36,
    },
  });

  for (const s of siswaList) {
    const cls = s.kelasLetter === "7A" ? class7A : class7B;
    await db.studentEnrollment.create({
      data: { classId: cls.id, studentId: s.user.id, nis: s.nis, status: "active" },
    });
  }

  // ============ MAPEL ============
  const mtk = await db.subject.create({
    data: { schoolId: school.id, code: "MTK", name: "Matematika", level: "SMP" },
  });
  const ipa = await db.subject.create({
    data: { schoolId: school.id, code: "IPA", name: "Ilmu Pengetahuan Alam", level: "SMP" },
  });
  const bind = await db.subject.create({
    data: { schoolId: school.id, code: "BIN", name: "Bahasa Indonesia", level: "SMP" },
  });

  await db.classSubject.create({ data: { classId: class7A.id, subjectId: mtk.id, teacherId: guru.id } });
  await db.classSubject.create({ data: { classId: class7B.id, subjectId: mtk.id, teacherId: guru.id } });
  await db.classSubject.create({ data: { classId: class7A.id, subjectId: ipa.id, teacherId: guru2.id } });
  await db.classSubject.create({ data: { classId: class7B.id, subjectId: ipa.id, teacherId: guru2.id } });
  await db.classSubject.create({ data: { classId: class7A.id, subjectId: bind.id, teacherId: guru.id } });

  // ============ BANK SOAL MTK ============
  const bankMTK = await db.questionBank.create({
    data: {
      schoolId: school.id,
      subjectId: mtk.id,
      ownerId: guru.id,
      name: "Bank Soal Matematika SMP",
      description: "Kumpulan soal Matematika kelas 7",
    },
  });

  const q1 = await db.question.create({
    data: {
      questionBankId: bankMTK.id,
      type: "MULTIPLE_CHOICE",
      stem: "Hasil dari 12 + 8 × 3 adalah ...",
      difficulty: "EASY",
      category: "Operasi Hitung",
      tags: JSON.stringify(["bilangan", "operasi"]),
      points: 1,
      options: {
        create: [
          { code: "A", text: "60", isCorrect: false, orderIndex: 0 },
          { code: "B", text: "36", isCorrect: true, orderIndex: 1 },
          { code: "C", text: "84", isCorrect: false, orderIndex: 2 },
          { code: "D", text: "20", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
  });

  const q2 = await db.question.create({
    data: {
      questionBankId: bankMTK.id,
      type: "MULTIPLE_CHOICE",
      stem: "Bentuk sederhana dari pecahan 6/8 adalah ...",
      difficulty: "EASY",
      category: "Pecahan",
      points: 1,
      options: {
        create: [
          { code: "A", text: "1/2", isCorrect: false, orderIndex: 0 },
          { code: "B", text: "2/3", isCorrect: false, orderIndex: 1 },
          { code: "C", text: "3/4", isCorrect: true, orderIndex: 2 },
          { code: "D", text: "3/8", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
  });

  const q3 = await db.question.create({
    data: {
      questionBankId: bankMTK.id,
      type: "TRUE_FALSE",
      stem: "Jika suatu persegi memiliki sisi 5 cm, maka luasnya adalah 25 cm².",
      difficulty: "EASY",
      category: "Geometri",
      points: 1,
      options: {
        create: [
          { code: "A", text: "Benar", isCorrect: true, orderIndex: 0 },
          { code: "B", text: "Salah", isCorrect: false, orderIndex: 1 },
        ],
      },
    },
  });

  const q4 = await db.question.create({
    data: {
      questionBankId: bankMTK.id,
      type: "SHORT_ANSWER",
      stem: "Akar kuadrat dari 144 adalah ...",
      difficulty: "MEDIUM",
      category: "Bilangan",
      points: 2,
      options: { create: [] },
    },
  });
  await db.questionOption.create({
    data: { questionId: q4.id, code: "KUNCI", text: "12", isCorrect: true, orderIndex: 99 },
  });

  const q5 = await db.question.create({
    data: {
      questionBankId: bankMTK.id,
      type: "ESSAY",
      stem: "Jelaskan dengan singkat apa yang dimaksud dengan bilangan prima dan berikan 5 contohnya.",
      difficulty: "MEDIUM",
      category: "Bilangan",
      points: 5,
      options: { create: [] },
    },
  });

  // ============ BANK SOAL IPA ============
  const bankIPA = await db.questionBank.create({
    data: {
      schoolId: school.id,
      subjectId: ipa.id,
      ownerId: guru2.id,
      name: "Bank Soal IPA Kelas 7",
      description: "Soal IPA Semester Ganjil",
    },
  });
  const qIPA1 = await db.question.create({
    data: {
      questionBankId: bankIPA.id,
      type: "MULTIPLE_CHOICE",
      stem: "Pernyataan yang benar tentang air mendidih adalah ...",
      difficulty: "MEDIUM",
      category: "Kalor",
      points: 1,
      options: {
        create: [
          { code: "A", text: "Air mendidih pada suhu 50°C", isCorrect: false, orderIndex: 0 },
          { code: "B", text: "Air mendidih menyerap kalor", isCorrect: true, orderIndex: 1 },
          { code: "C", text: "Air mendidih melepaskan kalor", isCorrect: false, orderIndex: 2 },
          { code: "D", text: "Air mendidih pada suhu 0°C", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
  });
  const qIPA2 = await db.question.create({
    data: {
      questionBankId: bankIPA.id,
      type: "MULTIPLE_CHOICE",
      stem: "Satuan internasional untuk suhu adalah ...",
      difficulty: "EASY",
      category: "Kalor",
      points: 1,
      options: {
        create: [
          { code: "A", text: "Celcius", isCorrect: false, orderIndex: 0 },
          { code: "B", text: "Reamur", isCorrect: false, orderIndex: 1 },
          { code: "C", text: "Kelvin", isCorrect: true, orderIndex: 2 },
          { code: "D", text: "Fahrenheit", isCorrect: false, orderIndex: 3 },
        ],
      },
    },
  });

  // ============ UJIAN ============
  const now = new Date();
  const start1 = new Date(now.getTime() - 60 * 60 * 1000);
  const end1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const exam1 = await db.exam.create({
    data: {
      schoolId: school.id,
      subjectId: mtk.id,
      ownerId: guru.id,
      academicYearId: ay.id,
      title: "Ulangan Harian Matematika — Operasi Hitung",
      description: "Ujian pertama semester ganjil. Cakupan: operasi hitung bilangan, pecahan, geometri dasar.",
      status: "published",
      startAt: start1,
      endAt: end1,
      durationMinutes: 30,
      maxAttempts: 1,
      passingScore: 70,
      shuffleQuestions: true,
      shuffleOptions: true,
      allowBackNav: true,
      allowAnswerChange: true,
      showResultImmediately: false,
      publishMode: "manual",
      antiCheatingConfig: JSON.stringify({
        tabSwitchLimit: 3,
        fullscreenRequired: true,
        cameraRequired: false,
        copyPasteBlocked: true,
        showIdentityVerification: false,
      }),
    },
  });

  const eqData = [
    { q: q1, order: 0, pts: 1 },
    { q: q2, order: 1, pts: 1 },
    { q: q3, order: 2, pts: 1 },
    { q: q4, order: 3, pts: 2 },
    { q: q5, order: 4, pts: 5 },
  ];
  for (const item of eqData) {
    const opts = await db.questionOption.findMany({ where: { questionId: item.q.id } });
    await db.examQuestion.create({
      data: {
        examId: exam1.id,
        questionId: item.q.id,
        orderIndex: item.order,
        points: item.pts,
        snapshot: JSON.stringify({
          type: item.q.type,
          stem: item.q.stem,
          options: opts.map((o) => ({ code: o.code, text: o.text, isCorrect: o.isCorrect })),
        }),
      },
    });
  }

  await db.examAssignment.create({
    data: { examId: exam1.id, classId: class7A.id, proctorId: proctor.id },
  });
  await db.examAssignment.create({
    data: { examId: exam1.id, classId: class7B.id, proctorId: proctor.id },
  });

  // Ujian 2: IPA - draft
  const exam2 = await db.exam.create({
    data: {
      schoolId: school.id,
      subjectId: ipa.id,
      ownerId: guru2.id,
      academicYearId: ay.id,
      title: "Ulangan Harian IPA — Kalor",
      description: "Ujian bab kalor dan perubahan wujud zat.",
      status: "draft",
      durationMinutes: 45,
      passingScore: 75,
    },
  });
  await db.examQuestion.create({
    data: {
      examId: exam2.id,
      questionId: qIPA1.id,
      orderIndex: 0,
      points: 1,
      snapshot: JSON.stringify({
        type: qIPA1.type,
        stem: qIPA1.stem,
        options: (await db.questionOption.findMany({ where: { questionId: qIPA1.id } })).map((o) => ({
          code: o.code,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      }),
    },
  });
  await db.examQuestion.create({
    data: {
      examId: exam2.id,
      questionId: qIPA2.id,
      orderIndex: 1,
      points: 1,
      snapshot: JSON.stringify({
        type: qIPA2.type,
        stem: qIPA2.stem,
        options: (await db.questionOption.findMany({ where: { questionId: qIPA2.id } })).map((o) => ({
          code: o.code,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      }),
    },
  });

  await db.auditLog.create({
    data: {
      schoolId: school.id,
      actorId: superadmin.id,
      action: "SEED",
      targetType: "School",
      targetId: school.id,
      metadata: JSON.stringify({ note: "Initial seed data created" }),
    },
  });

  console.log("✅ Seed selesai!");
  console.log("");
  console.log("Kredensial login (demo):");
  console.log("  superadmin@cbt.demo   / admin123  (Super Admin Platform)");
  console.log("  admin@sekolah1.cbt     / admin123  (Admin Sekolah)");
  console.log("  guru@sekolah1.cbt      / guru123   (Guru Matematika)");
  console.log("  guru2@sekolah1.cbt     / guru123   (Guru IPA)");
  console.log("  pengawas@sekolah1.cbt  / awas123   (Pengawas)");
  console.log("  siswa1@sekolah1.cbt    / siswa123  (Siswa kelas 7A)");
  console.log("  siswa2@sekolah1.cbt    / siswa123  (Siswa kelas 7A)");
  console.log("  siswa3@sekolah1.cbt    / siswa123  (Siswa kelas 7B)");
  console.log("");
  console.log(`School ID: ${school.id}`);
  console.log(`Exam ID (MTK published): ${exam1.id}`);
  console.log(`Exam ID (IPA draft): ${exam2.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
