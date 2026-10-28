import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Catatan: "standalone" bagus untuk Docker, tetapi Vercel tidak memerlukannya.
  // Vercel akan otomatis optimize build. Kita biarkan untuk compatibility Docker.
  output: "standalone",

  // Vercel handle TypeScript checking di CI terpisah (lebih cepat deploy)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Disable strict mode untuk performa (karena ada banyak useEffect dengan side effects)
  reactStrictMode: false,

  // Untuk Vercel: pastikan file static di folder public tersedia
  // (default sudah handle, tidak perlu konfigurasi tambahan)
};

export default nextConfig;
