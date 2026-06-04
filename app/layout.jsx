import "./globals.css";

export const metadata = {
  title: "Запевай — тренажёр текстов песен",
  description:
    "Выучи любую песню наизусть: интерактивные тренировки, уровни сложности и умные повторения.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0e" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className="min-h-screen font-sans">
        <div className="aurora" id="aurora">
          <div className="third" />
        </div>
        <div className="mx-auto max-w-lg px-4">{children}</div>
      </body>
    </html>
  );
}
