// Capture masdrmena.com header/hero/footer markup, computed styles and screenshots for reference.
import { chromium } from "playwright";
import fs from "node:fs";
const out = process.argv[2] ?? "./site";
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
for (const lang of ["en", "ar"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`https://masdrmena.com/${lang}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/site-${lang}.png`, fullPage: true });
  await p.screenshot({ path: `${out}/site-${lang}-top.png` });
  const data = await p.evaluate(() => {
    const cs = (el) => {
      const s = getComputedStyle(el);
      const keys = ["fontFamily","fontSize","fontWeight","color","backgroundColor","borderRadius","border","boxShadow","padding","height","letterSpacing","lineHeight","gap","textTransform","borderColor","borderWidth"];
      return Object.fromEntries(keys.map((k) => [k, s[k]]));
    };
    const header = document.querySelector("header") ?? document.querySelector("nav")?.closest("div");
    const footer = document.querySelector("footer");
    const walk = (el, depth = 0, max = 4) => {
      if (!el || depth > max) return null;
      return { tag: el.tagName.toLowerCase(), cls: el.className?.toString().slice(0, 200), text: el.childElementCount === 0 ? el.textContent?.trim().slice(0, 80) : undefined, style: cs(el), kids: [...el.children].slice(0, 14).map((k) => walk(k, depth + 1, max)) };
    };
    const links = [...document.querySelectorAll("header a, nav a")].map((a) => ({ text: a.textContent?.trim().slice(0, 60), href: a.getAttribute("href"), style: cs(a) }));
    const buttons = [...document.querySelectorAll("header button, nav button")].map((a) => ({ text: a.textContent?.trim().slice(0, 60), style: cs(a) }));
    const imgs = [...document.querySelectorAll("header img, nav img")].map((i) => ({ src: i.currentSrc || i.src, w: i.width, h: i.height, alt: i.alt }));
    const h1 = document.querySelector("h1");
    const hero = h1?.closest("section") ?? h1?.parentElement?.parentElement;
    const rootVars = getComputedStyle(document.documentElement);
    const vars = {};
    for (const sheet of document.styleSheets) { try { for (const r of sheet.cssRules) { if (r.selectorText === ":root" || r.selectorText === ":root, :host") for (const p of r.style) if (p.startsWith("--")) vars[p] = r.style.getPropertyValue(p).trim(); } } catch {} }
    return { title: document.title, headerHTML: header?.outerHTML.slice(0, 12000), headerTree: walk(header), links, buttons, imgs, heroHTML: hero?.outerHTML.slice(0, 8000), heroStyle: hero ? cs(hero) : null, h1: h1 ? { text: h1.textContent?.trim(), style: cs(h1) } : null, footerHTML: footer?.outerHTML.slice(0, 6000), body: cs(document.body), vars, fonts: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style}`).slice(0, 30) };
  });
  fs.writeFileSync(`${out}/site-${lang}.json`, JSON.stringify(data, null, 1));
  // hover state of the language selector
  const langBtn = await p.$('button:has-text("EN"), a:has-text("EN"), button:has-text("Egypt"), a:has-text("Egypt"), [class*="lang"], [class*="locale"]');
  if (langBtn) {
    const before = await langBtn.evaluate((el) => { const s = getComputedStyle(el); return { border: s.border, borderColor: s.borderColor, bg: s.backgroundColor, radius: s.borderRadius, padding: s.padding, shadow: s.boxShadow, html: el.outerHTML.slice(0, 600) }; });
    await langBtn.hover(); await p.waitForTimeout(400);
    const after = await langBtn.evaluate((el) => { const s = getComputedStyle(el); return { border: s.border, borderColor: s.borderColor, bg: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow }; });
    fs.writeFileSync(`${out}/langbtn-${lang}.json`, JSON.stringify({ before, after }, null, 1));
    await langBtn.screenshot({ path: `${out}/langbtn-${lang}-hover.png` });
  }
  await ctx.close();
}
await b.close();
console.log("captured");
