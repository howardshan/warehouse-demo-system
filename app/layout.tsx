import type { Metadata } from "next";
import { Source_Sans_3, IBM_Plex_Sans } from "next/font/google";
import { getRequestLocale } from "@/app/actions/i18n";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  return {
    title: t(messages, "app.name"),
    description: t(messages, "app.tagline"),
  };
}

const HTML_LANG: Record<string, string> = {
  zh: "zh-CN",
  en: "en",
  "es-MX": "es-MX",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  return (
    <html lang={HTML_LANG[locale] ?? "zh-CN"}>
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
