import { chromium } from "playwright";
import fs from "node:fs";
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("https://masdrmena.com/en", { waitUntil: "networkidle", timeout: 90000 });
const hrefs = await p.evaluate(() => [...document.querySelectorAll("a[href^='/en/']")].map((a) => a.getAttribute("href")).filter((h, i, arr) => arr.indexOf(h) === i).slice(0, 40));
fs.writeFileSync(`${out}/hrefs.json`, JSON.stringify(hrefs));
const target = hrefs.find((h) => /categor|factor|product|supplier|search/.test(h)) ?? hrefs.find((h) => !/auth/.test(h)) ?? "/en/auth/login";
await p.goto(`https://masdrmena.com${target}`, { waitUntil: "networkidle", timeout: 90000 });
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/inner-top.png` });
const info = await p.evaluate(() => {
  const h = document.querySelector("header");
  const cs = h ? getComputedStyle(h) : null;
  return { url: location.href, headerHTML: h?.outerHTML.slice(0, 5000), headerBg: cs?.backgroundColor, headerPos: cs?.position, bodyBg: getComputedStyle(document.body).backgroundColor };
});
fs.writeFileSync(`${out}/inner.json`, JSON.stringify(info, null, 1));
// footer from home
await p.goto("https://masdrmena.com/en", { waitUntil: "networkidle", timeout: 90000 });
const footer = await p.$("footer");
if (footer) { await footer.scrollIntoViewIfNeeded(); await footer.screenshot({ path: `${out}/footer.png` }); }
await b.close();
console.log("inner:", target);
