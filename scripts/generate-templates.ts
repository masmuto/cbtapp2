// Generate template import soal dalam format XLSX dan DOCX
// Jalankan: bun run scripts/generate-templates.ts
import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DOWNLOAD_DIR = "/home/z/my-project/download";
mkdirSync(DOWNLOAD_DIR, { recursive: true });

// ============================
// TEMPLATE EXCEL (.xlsx)
// ============================
const excelData = [
  // Header
  ["type", "stem", "points", "difficulty", "category", "optionA", "optionB", "optionC", "optionD", "optionE", "correctAnswer", "explanation"],
  // Contoh MULTIPLE_CHOICE
  ["MULTIPLE_CHOICE", "Hasil dari 7 × 8 adalah ...", 1, "EASY", "Operasi Hitung", "54", "56", "58", "64", "", "B", "7 × 8 = 56"],
  ["MULTIPLE_CHOICE", "Ibu kota Indonesia adalah ...", 1, "EASY", "Geografi", "Bandung", "Jakarta", "Surabaya", "Medan", "", "B", "Jakarta adalah ibu kota RI"],
  // Contoh MULTIPLE_RESPONSE (multi jawaban benar, dipisah koma)
  ["MULTIPLE_RESPONSE", "Manakah dari berikut yang merupakan bilangan prima?", 2, "MEDIUM", "Bilangan", "2", "4", "3", "9", "5", "A,C,E", "2, 3, 5 prima; 4 dan 9 komposit"],
  // Contoh TRUE_FALSE
  ["TRUE_FALSE", "Air mendidih pada suhu 100°C di permukaan laut.", 1, "EASY", "Sains", "Benar", "Salah", "", "", "", "A", "Benar, 100°C pada 1 atm"],
  // Contoh SHORT_ANSWER
  ["SHORT_ANSWER", "Berapakah akar kuadrat dari 144?", 2, "MEDIUM", "Bilangan", "", "", "", "", "", "12", "12 × 12 = 144"],
  // Contoh ESSAY
  ["ESSAY", "Jelaskan dengan singkat apa yang dimaksud dengan bilangan prima dan berikan 5 contohnya.", 5, "MEDIUM", "Bilangan", "", "", "", "", "", "", "Bilangan prima adalah bilangan asli >1 yang hanya habis dibagi 1 dan dirinya sendiri. Contoh: 2, 3, 5, 7, 11"],
  // Baris dengan error (untuk demo validasi)
  // ["MULTIPLE_CHOICE", "Soal tanpa jawaban benar", 1, "EASY", "Test", "A", "B", "C", "D", "", "E", ""], // error: kode E tidak ada
];

const ws = XLSX.utils.aoa_to_sheet(excelData);
// Set kolom width
ws["!cols"] = [
  { wch: 18 }, // type
  { wch: 50 }, // stem
  { wch: 8 },  // points
  { wch: 12 }, // difficulty
  { wch: 15 }, // category
  { wch: 15 }, // optionA
  { wch: 15 }, // optionB
  { wch: 15 }, // optionC
  { wch: 15 }, // optionD
  { wch: 15 }, // optionE
  { wch: 15 }, // correctAnswer
  { wch: 40 }, // explanation
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Soal");
const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
writeFileSync(join(DOWNLOAD_DIR, "template-import-soal.xlsx"), xlsxBuffer);
console.log("✓ template-import-soal.xlsx generated");

// ============================
// TEMPLATE CSV (.csv)
// ============================
const csv = excelData.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
writeFileSync(join(DOWNLOAD_DIR, "template-import-soal.csv"), csv, "utf-8");
console.log("✓ template-import-soal.csv generated");

// ============================
// TEMPLATE WORD (.docx) - format minimal
// ============================
// Catatan: untuk membuat .docx sebenarnya butuh library docx. Karena fokusnya parsing,
// kita buat versi .txt dengan penjelasan format yang bisa di-copy ke Word.
const docxFormat = `TEMPLATE IMPORT SOAL FORMAT WORD (.docx)
========================================

FORMAT:
- Setiap soal dipisahkan oleh BARIS KOSONG
- Baris pertama tiap soal: [TYPE] diikuti pertanyaan
- Opsi ditulis: A. teks / B. teks / C. teks / D. teks
- Metadata: ANSWER:, POINTS:, DIFFICULTY:, CATEGORY:, EXPLANATION:
- Tipe yang didukung: MULTIPLE_CHOICE, MULTIPLE_RESPONSE, TRUE_FALSE, SHORT_ANSWER, ESSAY

CONTOH SOAL (copy ke Word, hapus komentar, simpan sebagai .docx):

[MULTIPLE_CHOICE] Hasil dari 7 × 8 adalah ...
A. 54
B. 56
C. 58
D. 64
ANSWER: B
POINTS: 1
DIFFICULTY: EASY
CATEGORY: Operasi Hitung
EXPLANATION: 7 × 8 = 56

[MULTIPLE_RESPONSE] Manakah yang merupakan bilangan prima?
A. 2
B. 4
C. 3
D. 9
E. 5
ANSWER: A,C,E
POINTS: 2
DIFFICULTY: MEDIUM
CATEGORY: Bilangan
EXPLANATION: 2, 3, 5 prima; 4 dan 9 komposit

[TRUE_FALSE] Air mendidih pada suhu 100°C di permukaan laut.
A. Benar
B. Salah
ANSWER: A
POINTS: 1
DIFFICULTY: EASY
CATEGORY: Sains
EXPLANATION: 100°C pada 1 atm

[SHORT_ANSWER] Berapakah akar kuadrat dari 144?
ANSWER: 12
POINTS: 2
DIFFICULTY: MEDIUM
CATEGORY: Bilangan
EXPLANATION: 12 × 12 = 144

[ESSAY] Jelaskan dengan singkat apa yang dimaksud dengan bilangan prima dan berikan 5 contohnya.
POINTS: 5
DIFFICULTY: MEDIUM
CATEGORY: Bilangan
EXPLANATION: Bilangan prima adalah bilangan asli >1 yang hanya habis dibagi 1 dan dirinya sendiri. Contoh: 2, 3, 5, 7, 11

---

CATATAN:
- Alias tipe yang diterima: PG=MULTIPLE_CHOICE, PGK=MULTIPLE_RESPONSE, BS=TRUE_FALSE, ISIAN=SHORT_ANSWER, ESAI=ESSAY
- Untuk TRUE_FALSE, jika opsi A/B kosong akan otomatis diset "Benar"/"Salah"
- correctAnswer untuk MULTIPLE_RESPONSE pisahkan dengan koma (cth: A,C,E)
- Difficulty alias: MUDAH=EASY, SEDANG=MEDIUM, SULIT/HARD=HARD
`;

// Buat file .txt dulu sebagai panduan
writeFileSync(join(DOWNLOAD_DIR, "template-import-soal.docx.txt"), docxFormat, "utf-8");
console.log("✓ template-import-soal.docx.txt generated (panduan format Word)");
console.log("");
console.log("Untuk file .docx sebenarnya, salin konten dari .docx.txt ke Microsoft Word");
console.log("dan simpan sebagai format .docx. Parser mammoth akan membaca teks mentahnya.");
