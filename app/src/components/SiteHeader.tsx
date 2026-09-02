"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Lang } from "@/lib/i18n/strings";
import { LangDropdown } from "./LangDropdown";

/**
 * Header actions shared by the dark landing header and the light inner header:
 * language dropdown, secondary pill, primary glowing pill — the same three
 * elements masdrmena.com places at the top right.
 */
export function HeaderActions({ lang, theme }: { lang: Lang; theme: "dark" | "light" }) {
  const s = t(lang);
  return (
    <div className="flex items-center gap-3 md:gap-5">
      <LangDropdown lang={lang} theme={theme} />
      <Link href="/packs" className={theme === "dark" ? "pill-ghost-dark" : "pill-ghost-light"}>
        {s.nav_packs}
      </Link>
      <Link href="/" className="pill-primary">
        {s.nav_new}
      </Link>
    </div>
  );
}

export function Logo({ variant, className = "" }: { variant: "white" | "purple"; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={variant === "white" ? "/brand/masdr-logo-white.png" : "/brand/masdr-logo.png"} alt="MASDR" width={187} height={172} className={className} />
  );
}

/** Light header for inner pages (the landing page renders its own header inside the hero). */
export function SiteHeader({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.endsWith("/print")) return null;
  return (
    <header className="no-print mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 py-5 md:px-8">
      <Link href="/" className="flex items-center" aria-label="Masdr">
        <Logo variant="purple" className="h-12 w-auto md:h-14" />
      </Link>
      <HeaderActions lang={lang} theme="light" />
    </header>
  );
}
