import Link from "next/link";
import { getLang } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/strings";
import { GenerateForm } from "@/components/GenerateForm";
import { HeaderActions, Logo } from "@/components/SiteHeader";

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A9359" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export default async function Home() {
  const lang = await getLang();
  const s = t(lang);
  const chips = lang === "ar" ? ["قبعة بكت", "تويل قطني", "بوجهين", "مقاسات S/M/L"] : ["Bucket hat", "Cotton twill", "Reversible", "Sizes S/M/L"];
  return (
    <div className="bg-white">
      {/* Dark rounded hero panel with the header inside it, as on masdrmena.com */}
      <section className="hero-panel relative mx-[12px] mt-[12px] overflow-hidden rounded-[20px] md:mx-[1.19vw] md:mt-[1.19vw] md:rounded-[1.43vw]">
        <header className="absolute left-0 right-0 top-0 z-20 flex w-full items-center justify-between px-6 py-6 md:px-[1.9vw] md:py-[1.43vw]">
          <Link href="/" className="flex items-center" aria-label="Masdr">
            <Logo variant="white" className="h-16 w-auto md:h-[3.2vw] md:min-h-[46px]" />
          </Link>
          <HeaderActions lang={lang} theme="dark" />
        </header>

        <div className="relative z-10 flex flex-col items-center px-6 pb-[6vw] pt-[9vw] text-center md:pt-[8vw]">
          <span className="hero-badge">
            <GlobeIcon />
            {s.hero_badge}
          </span>
          <h1 className="hero-title mt-6">{s.hero_title}</h1>
          <p className="hero-sub mt-6 max-w-[860px]">{s.hero_sub}</p>
          <a href="#generate" className="hero-search mt-8" aria-label={s.form_submit}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#758ea7" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <span className="flex-1 text-start text-[15px] text-[#758ea7] md:text-[1.07vw]">{s.form_description_ph}</span>
            <span className="hero-search-arrow" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#362E83" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </a>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {chips.map((c) => (
              <a key={c} href="#generate" className="hero-chip">
                {c}
              </a>
            ))}
          </div>
        </div>
        <div className="hero-glow" aria-hidden="true" />
      </section>

      <section id="generate" className="mx-auto max-w-[1400px] scroll-mt-6 px-6 pb-10 pt-12 md:px-[1.9vw] md:pt-[3.5vw]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[26px] font-normal text-[#010101] md:text-[2.14vw]">{s.form_submit}</h2>
          <ol className="flex flex-wrap gap-2 text-[13px] text-[#4d4d4d] md:text-[0.83vw]">
            {[s.step1, s.step2, s.step3].map((step, i) => (
              <li key={step} className="flex items-center gap-2 rounded-full bg-[#f1f4f6] px-3 py-1.5">
                <span className="num inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#362E83] text-[11px] font-bold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <GenerateForm lang={lang} />
      </section>
    </div>
  );
}
