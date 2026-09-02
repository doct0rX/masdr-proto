import type { Metadata, Viewport } from "next";
import { Cairo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/i18n/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const cairo = Cairo({ variable: "--font-cairo", subsets: ["arabic", "latin"], weight: ["400", "600", "700"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

/* Satoshi Variable, the body face used on masdrmena.com (Fontshare, free licence), loaded via CSS import in globals.css */
export const metadata: Metadata = {
  title: "Masdr — Tech Pack",
  description: "Turn a product photo or sketch into a factory-ready, bilingual manufacturing tech pack for Egyptian factories.",
  icons: { icon: "/brand/masdr-mark-64.png" },
};

export const viewport: Viewport = { themeColor: "#301989" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`${cairo.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SiteHeader lang={lang} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
