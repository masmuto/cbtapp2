// Generate file .docx sebenarnya menggunakan library docx
// Jalankan: bun run scripts/generate-docx-template.ts
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { writeFileSync } from "fs";

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "TEMPLATE IMPORT SOAL — CBT Sekolah", bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Format: .docx — setiap soal dipisahkan baris kosong", italics: true, color: "666666" })],
      }),
      new Paragraph({ children: [] }), // baris kosong

      // Petunjuk
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Petunjuk Penggunaan" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "1. Setiap soal dipisahkan oleh BARIS KOSONG" })] }),
      new Paragraph({ children: [new TextRun({ text: "2. Baris pertama tiap soal: [TYPE] diikuti pertanyaan" })] }),
      new Paragraph({ children: [new TextRun({ text: "3. Opsi ditulis: A. teks / B. teks / C. teks / D. teks" })] }),
      new Paragraph({ children: [new TextRun({ text: "4. Metadata: ANSWER:, POINTS:, DIFFICULTY:, CATEGORY:, EXPLANATION:" })] }),
      new Paragraph({ children: [new TextRun({ text: "5. Tipe: MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, SHORT_ANSWER, ESSAY" })] }),
      new Paragraph({ children: [] }),

      // Contoh 1
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Contoh 1: Pilihan Ganda" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "[MULTIPLE_CHOICE] Hasil dari 7 × 8 adalah ..." })] }),
      new Paragraph({ children: [new TextRun({ text: "A. 54" })] }),
      new Paragraph({ children: [new TextRun({ text: "B. 56" })] }),
      new Paragraph({ children: [new TextRun({ text: "C. 58" })] }),
      new Paragraph({ children: [new TextRun({ text: "D. 64" })] }),
      new Paragraph({ children: [new TextRun({ text: "ANSWER: B" })] }),
      new Paragraph({ children: [new TextRun({ text: "POINTS: 1" })] }),
      new Paragraph({ children: [new TextRun({ text: "DIFFICULTY: EASY" })] }),
      new Paragraph({ children: [new TextRun({ text: "CATEGORY: Operasi Hitung" })] }),
      new Paragraph({ children: [new TextRun({ text: "EXPLANATION: 7 × 8 = 56" })] }),
      new Paragraph({ children: [] }),

      // Contoh 2
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Contoh 2: Pilihan Ganda Kompleks (Multiple Response)" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "[MULTIPLE_RESPONSE] Manakah yang merupakan bilangan prima?" })] }),
      new Paragraph({ children: [new TextRun({ text: "A. 2" })] }),
      new Paragraph({ children: [new TextRun({ text: "B. 4" })] }),
      new Paragraph({ children: [new TextRun({ text: "C. 3" })] }),
      new Paragraph({ children: [new TextRun({ text: "D. 9" })] }),
      new Paragraph({ children: [new TextRun({ text: "E. 5" })] }),
      new Paragraph({ children: [new TextRun({ text: "ANSWER: A,C,E" })] }),
      new Paragraph({ children: [new TextRun({ text: "POINTS: 2" })] }),
      new Paragraph({ children: [new TextRun({ text: "DIFFICULTY: MEDIUM" })] }),
      new Paragraph({ children: [new TextRun({ text: "CATEGORY: Bilangan" })] }),
      new Paragraph({ children: [new TextRun({ text: "EXPLANATION: 2, 3, 5 prima; 4 dan 9 komposit" })] }),
      new Paragraph({ children: [] }),

      // Contoh 3
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Contoh 3: Benar / Salah" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "[TRUE_FALSE] Air mendidih pada suhu 100°C di permukaan laut." })] }),
      new Paragraph({ children: [new TextRun({ text: "A. Benar" })] }),
      new Paragraph({ children: [new TextRun({ text: "B. Salah" })] }),
      new Paragraph({ children: [new TextRun({ text: "ANSWER: A" })] }),
      new Paragraph({ children: [new TextRun({ text: "POINTS: 1" })] }),
      new Paragraph({ children: [new TextRun({ text: "DIFFICULTY: EASY" })] }),
      new Paragraph({ children: [new TextRun({ text: "CATEGORY: Sains" })] }),
      new Paragraph({ children: [new TextRun({ text: "EXPLANATION: 100°C pada 1 atm" })] }),
      new Paragraph({ children: [] }),

      // Contoh 4
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Contoh 4: Isian Singkat" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "[SHORT_ANSWER] Berapakah akar kuadrat dari 144?" })] }),
      new Paragraph({ children: [new TextRun({ text: "ANSWER: 12" })] }),
      new Paragraph({ children: [new TextRun({ text: "POINTS: 2" })] }),
      new Paragraph({ children: [new TextRun({ text: "DIFFICULTY: MEDIUM" })] }),
      new Paragraph({ children: [new TextRun({ text: "CATEGORY: Bilangan" })] }),
      new Paragraph({ children: [new TextRun({ text: "EXPLANATION: 12 × 12 = 144" })] }),
      new Paragraph({ children: [] }),

      // Contoh 5
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Contoh 5: Esai" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "[ESSAY] Jelaskan dengan singkat apa yang dimaksud dengan bilangan prima dan berikan 5 contohnya." })] }),
      new Paragraph({ children: [new TextRun({ text: "POINTS: 5" })] }),
      new Paragraph({ children: [new TextRun({ text: "DIFFICULTY: MEDIUM" })] }),
      new Paragraph({ children: [new TextRun({ text: "CATEGORY: Bilangan" })] }),
      new Paragraph({ children: [new TextRun({ text: "EXPLANATION: Bilangan prima adalah bilangan asli >1 yang hanya habis dibagi 1 dan dirinya sendiri. Contoh: 2, 3, 5, 7, 11" })] }),
      new Paragraph({ children: [] }),

      // Catatan
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Catatan Penting" })],
      }),
      new Paragraph({ children: [new TextRun({ text: "- Alias tipe: PG=MULTIPLE_CHOICE, PGK=MULTIPLE_RESPONSE, BS=TRUE_FALSE, ISIAN=SHORT_ANSWER, ESAI=ESSAY" })] }),
      new Paragraph({ children: [new TextRun({ text: "- Untuk TRUE_FALSE, jika opsi A/B kosong akan otomatis diset 'Benar'/'Salah'" })] }),
      new Paragraph({ children: [new TextRun({ text: "- correctAnswer MULTIPLE_RESPONSE pisahkan dengan koma (cth: A,C,E)" })] }),
      new Paragraph({ children: [new TextRun({ text: "- Difficulty alias: MUDAH=EASY, SEDANG=MEDIUM, SULIT=HARD" })] }),
      new Paragraph({ children: [new TextRun({ text: "- Hapus contoh di atas sebelum upload, atau ganti dengan soal Anda sendiri" })] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync("/home/z/my-project/download/template-import-soal.docx", buffer);
  console.log("✓ template-import-soal.docx generated");
}).catch((err) => {
  console.error("✗ Gagal:", err);
  process.exit(1);
});
