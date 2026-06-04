import "./globals.css";
import { Playfair_Display, Golos_Text } from "next/font/google";

const display = Playfair_Display({
  subsets: ["cyrillic", "latin"],
  variable: "--font-display",
});
const body = Golos_Text({
  subsets: ["cyrillic", "latin"],
  variable: "--font-body",
});

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
        <div className="aurora" id="aurora">
          <div className="third" />
        </div>
        <div className="mx-auto max-w-lg px-4">{children}</div>
      </body>
    </html>
  );
}
