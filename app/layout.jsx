import "./globals.css";
import { Playfair_Display, Golos_Text } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const display = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-display",
});
const body = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-body",
});

export const metadata = {
  metadataBase: new URL("https://zapevai.vercel.app"),
  title: {
    default: "Запевай — выучи текст любой песни наизусть",
    template: "%s — Запевай",
  },
  description:
    "Тренажёр для заучивания текстов песен: вставь слова, пройди уровни, закрепи умными повторениями. Бесплатно, без регистрации.",
  keywords: [
    "выучить текст песни наизусть",
    "тренажёр текстов песен",
    "запомнить слова песни",
    "заучить слова песни",
    "учить песни",
  ],
  manifest: "/manifest.json",
  alternates: { canonical: "https://zapevai.vercel.app" },
  appleWebApp: {
    capable: true,
    title: "Запевай",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Запевай — выучи текст любой песни наизусть",
    description:
      "Выучи слова любой песни наизусть: пропуски, уровни сложности и интервальные повторения. Бесплатный тренажёр текстов.",
    url: "https://zapevai.vercel.app",
    siteName: "Запевай",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Запевай — выучи текст любой песни наизусть",
    description:
      "Пропуски, уровни сложности и умные повторения. Бесплатный тренажёр текстов песен.",
    images: ["https://zapevai.vercel.app/opengraph-image"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f1e7",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('zp_theme');if(t&&t!=='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Запевай",
              url: "https://zapevai.vercel.app",
              description:
                "Тренажёр для заучивания текстов песен наизусть",
              applicationCategory: "EducationApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "RUB" },
              inLanguage: "ru",
            }),
          }}
        />
        <div className="aurora" id="aurora">
          <div className="third" />
        </div>
        <div className="mx-auto max-w-lg px-4">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
