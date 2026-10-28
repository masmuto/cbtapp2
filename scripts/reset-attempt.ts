import { db } from "../src/lib/db";

// Reset attempt siswa1 untuk ujian yang in_progress / submitted
async function main() {
  console.log("🧹 Reset semua attempt...");
  const deleted = await db.examAttempt.deleteMany({});
  console.log(`✅ ${deleted.count} attempt dihapus`);
  console.log("Sekarang siswa bisa mulai ujian dari awal.");
}

main().catch(console.error).finally(() => db.$disconnect());
