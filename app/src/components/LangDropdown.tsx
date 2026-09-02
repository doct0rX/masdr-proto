"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n/strings";

/** Egypt flag roundel, copied from masdrmena.com's header. */
export function EgyptFlag({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 28 28" fill="none" className="shrink-0" aria-hidden="true">
      <g clipPath="url(#egyptFlagClip)">
        <path d="M14 28C21.732 28 28 21.732 28 14C28 6.26801 21.732 0 14 0C6.26801 0 0 6.26801 0 14C0 21.732 6.26801 28 14 28Z" fill="white" />
        <path d="M14.0001 0C7.98055 0 2.84895 3.79925 0.87085 9.13046H27.1293C25.1512 3.79925 20.0196 0 14.0001 0Z" fill="#D80027" />
        <path d="M14.0001 28C20.0196 28 25.1512 24.2008 27.1293 18.8696H0.87085C2.84895 24.2008 7.98055 28 14.0001 28Z" fill="black" />
        <path d="M18.8696 12.4783H15.2174C15.2174 11.8059 14.6723 11.2609 14 11.2609C13.3276 11.2609 12.7826 11.8059 12.7826 12.4783H9.13037C9.13037 13.1506 9.71602 13.6957 10.3883 13.6957H10.3478C10.3478 14.368 10.8928 14.9131 11.5652 14.9131C11.5652 15.5854 12.1102 16.1305 12.7826 16.1305H15.2174C15.8897 16.1305 16.4348 15.5854 16.4348 14.9131C17.1071 14.9131 17.6522 14.368 17.6522 13.6957H17.6116C18.284 13.6957 18.8696 13.1506 18.8696 12.4783Z" fill="#FF9811" />
      </g>
      <defs>
        <clipPath id="egyptFlagClip">
          <rect width="28" height="28" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function setLangCookie(code: Lang) {
  document.cookie = `masdr_lang=${code}; path=/; max-age=31536000; samesite=lax`;
}

const OPTIONS: { code: Lang; country: string; detail: string }[] = [
  { code: "en", country: "Egypt", detail: "(EN/EGP)" },
  { code: "ar", country: "مصر", detail: "(عربي/جنيه)" },
];

/**
 * Language selector styled like masdrmena.com: transparent, no border at rest,
 * a border appears on hover, chevron, and a small dropdown with both locales.
 */
export function LangDropdown({ lang, theme }: { lang: Lang; theme: "dark" | "light" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.code === lang) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (code: Lang) => {
    setOpen(false);
    if (code === lang) return;
    setLangCookie(code);
    start(() => router.refresh());
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className={`lang-trigger ${theme === "dark" ? "lang-trigger-dark" : "lang-trigger-light"}`}
      >
        <EgyptFlag />
        <span className="whitespace-nowrap">
          {current.country}
          <span className={theme === "dark" ? "text-[#d6dde5]" : "text-[#758ea7]"}> {current.detail}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="lang-menu">
          {OPTIONS.map((o) => (
            <button key={o.code} role="menuitem" type="button" onClick={() => choose(o.code)} className={`lang-item ${o.code === lang ? "lang-item-active" : ""}`} dir={o.code === "ar" ? "rtl" : "ltr"}>
              <EgyptFlag size={22} />
              <span>
                {o.country} <span className="text-[#758ea7]">{o.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
