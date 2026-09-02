"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n/strings";
import { Logo } from "./SiteHeader";

const PinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 18.3c-.3 0-1.1-.5-2.4-1.8C6 14.9 3.3 11.7 3.3 8.3a6.7 6.7 0 0 1 13.4 0c0 3.4-2.7 6.6-4.3 8.2-1.3 1.3-2.1 1.8-2.4 1.8Z" stroke="#0A9359" strokeWidth="2" />
    <circle cx="10" cy="8.33" r="2.5" stroke="#0A9359" strokeWidth="2" />
  </svg>
);
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M7.4 5.2 5.9 3.4a1.5 1.5 0 0 0-2.3.1c-1.2 1.6-1.5 3.8-.4 5.5.7 1.2 1.7 2.6 3 3.9 1.5 1.5 3.1 2.6 4.5 3.5 1.7 1 3.8.8 5.5-.4.8-.5.8-1.7.1-2.3l-1.9-1.6a1.2 1.2 0 0 0-1.2-.1l-2.3 1.2c-.5.2-1 .2-1.4-.2l-2.2-2.2c-.4-.4-.4-.9-.2-1.4l1.2-2.3c.2-.4.1-.9-.2-1.3Z" stroke="#0A9359" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <rect x="2.5" y="4.2" width="15" height="11.7" rx="2" stroke="#0A9359" strokeWidth="2" />
    <path d="m3.3 6 6.7 5 6.7-5" stroke="#0A9359" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export function SiteFooter({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  if (pathname.endsWith("/print")) return null;
  const ar = lang === "ar";
  return (
    <footer className="no-print bg-white px-6 pb-10 pt-14 md:px-[3.81vw] md:pb-[3.15vw] md:pt-[4.82vw]">
      <div className="mx-auto w-full max-w-[92.38vw]">
        <div className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:gap-[1.9vw]">
          <div className="w-full lg:max-w-[39.35vw]">
            <Link href="/" className="mb-10 flex" aria-label="Masdr">
              <Logo variant="purple" className="h-12 w-auto md:h-[3.2vw]" />
            </Link>
            <ul className="flex flex-col items-start gap-4 text-[14px] font-semibold leading-[150%] text-[#010101] md:gap-[0.95vw] md:text-[0.83vw]">
              <li className="flex items-center gap-3">
                <PinIcon />
                <span>{ar ? "الشيخ زايد، القاهرة، مصر" : "Sheikh Zayed, Cairo, Egypt"}</span>
              </li>
              <li className="flex items-center gap-3">
                <PhoneIcon />
                <span className="num">+201205553884</span>
              </li>
              <li className="flex items-center gap-3">
                <MailIcon />
                <span>Adham@masdrmena.com</span>
              </li>
            </ul>
            <p className="mt-8 text-[13px] text-[#4d4d4d] md:text-[0.83vw]">© 2026 Masdr. {ar ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
          </div>
          <div className="flex w-full flex-col gap-10 sm:flex-row sm:justify-between lg:w-auto lg:gap-[9vw]">
            <div>
              <h3 className="mb-6 text-[26px] font-normal text-[#010101] md:text-[2.14vw]">{ar ? "روابط سريعة" : "Quick Links"}</h3>
              <ul className="flex flex-col gap-4 text-[15px] text-[#010101] md:text-[0.95vw]">
                <li>
                  <Link href="/">{ar ? "ملف فني جديد" : "New tech pack"}</Link>
                </li>
                <li>
                  <Link href="/packs">{ar ? "ملفاتي الفنية" : "My tech packs"}</Link>
                </li>
                <li>
                  <a href="https://masdrmena.com/en/privacy-policy" target="_blank" rel="noreferrer">
                    {ar ? "سياسة الخصوصية" : "Privacy Policy"}
                  </a>
                </li>
                <li>
                  <a href="https://masdrmena.com/en/terms-of-service" target="_blank" rel="noreferrer">
                    {ar ? "شروط الخدمة" : "Terms of Service"}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-6 text-[26px] font-normal text-[#010101] md:text-[2.14vw]">{ar ? "تابعنا" : "Follow Us"}</h3>
              <div className="flex items-center gap-4">
                <a href="https://www.linkedin.com/company/masdrmena" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="social-dot">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A9359" aria-hidden="true">
                    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9Z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/masdrmena/" target="_blank" rel="noreferrer" aria-label="Instagram" className="social-dot">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A9359" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="#0A9359" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex items-center justify-end gap-3 text-[13px] text-[#4d4d4d] md:text-[0.83vw]">
          <a href="https://masdrmena.com/en/privacy-policy" target="_blank" rel="noreferrer">
            {ar ? "سياسة الخصوصية" : "Privacy Policy"}
          </a>
          <span>|</span>
          <a href="https://masdrmena.com/en/terms-of-service" target="_blank" rel="noreferrer">
            {ar ? "شروط الخدمة" : "Terms of Service"}
          </a>
        </div>
      </div>
    </footer>
  );
}
