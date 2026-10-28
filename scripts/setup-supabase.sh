#!/usr/bin/env bash
# ================================================================
# Script: setup-supabase.sh
# Fungsi: Mengubah konfigurasi Prisma dari SQLite → PostgreSQL (Supabase)
#
# Cara pakai:
#   1. Pastikan sudah set DATABASE_URL (Supabase) di .env
#   2. Jalankan: bash scripts/setup-supabase.sh
# ================================================================
set -e

SCHEMA_FILE="prisma/schema.prisma"
ENV_FILE=".env"

echo "🔧 Setup Prisma untuk Supabase PostgreSQL..."
echo ""

# 1. Cek .env ada dan punya DATABASE_URL PostgreSQL
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ File .env tidak ditemukan."
  echo "   Salin dari .env.example: cp .env.example .env"
  echo "   Lalu set DATABASE_URL ke Supabase connection string."
  exit 1
fi

DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' || true)
if [[ "$DB_URL" != postgresql://* ]] && [[ "$DB_URL" != postgres://* ]]; then
  echo "❌ DATABASE_URL di .env belum berupa PostgreSQL connection string."
  echo "   Current value: ${DB_URL:0:50}..."
  echo ""
  echo "   Dapatkan connection string dari:"
  echo "   Supabase Dashboard → Project Settings → Database → Connection string → URI"
  echo "   Format: postgresql://postgres.[REF]:[PASSWORD]@aws-X-[REGION].pooler.supabase.com:5432/postgres"
  exit 1
fi

echo "✅ DATABASE_URL terdeteksi sebagai PostgreSQL."
echo "   Host: $(echo $DB_URL | sed -E 's|.*@([^:]+).*|\1|')"

# 2. Update provider di schema.prisma dari sqlite → postgresql
if grep -q 'provider = "sqlite"' "$SCHEMA_FILE"; then
  echo ""
  echo "📝 Mengubah provider di $SCHEMA_FILE dari sqlite → postgresql..."
  sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' "$SCHEMA_FILE"
  rm -f "${SCHEMA_FILE}.bak"
  echo "✅ Schema updated."
else
  echo "ℹ️  Schema sudah menggunakan PostgreSQL."
fi

# 3. Generate Prisma client
echo ""
echo "🔨 Generate Prisma client..."
npx prisma generate

# 4. Push schema ke database (buat tabel)
echo ""
echo "📤 Push schema ke Supabase (membuat semua tabel)..."
echo "   Ini akan membuat 21 tabel di database Supabase Anda."
npx prisma db push --accept-data-loss

# 5. Konfirmasi
echo ""
echo "🎉 Setup selesai!"
echo ""
echo "Langkah berikutnya:"
echo "  1. Jalankan seed: bun run scripts/seed.ts (atau npx tsx scripts/seed.ts)"
echo "  2. Test dev server: bun run dev"
echo "  3. Atau deploy ke Vercel"
echo ""
echo "⚠️  Catatan:"
echo "   - Jangan commit .env (sudah di-gitignore)"
echo "   - Set NEXTAUTH_SECRET & NEXTAUTH_URL di Vercel dashboard"
echo "   - Gunakan connection pooling URL Supabase (port 6543) jika ada error 'too many connections'"
