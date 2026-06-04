/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Запрет встраивания сайта в чужие iframe (кликджекинг)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Запрет угадывания MIME-типов
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Не отдавать полный URL сторонним сайтам
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS всегда
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Отключаем ненужные API браузера
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/icon.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

module.exports = nextConfig;
