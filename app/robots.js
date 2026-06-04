export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/terms"],
        disallow: ["/admin", "/profile", "/auth", "/add", "/song/", "/train/"],
      },
    ],
    sitemap: "https://zapevai.vercel.app/sitemap.xml",
  };
}
