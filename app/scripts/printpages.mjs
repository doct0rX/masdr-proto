// Rasterise print pages with Chromium in print media at A4-landscape width for QA.
import { chromium } from "playwright";
const [packId, lang = "en", mode = "full", out = "./screens"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1100, height: 780 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.emulateMedia({ media: "print" });
await p.goto(`http://127.0.0.1:3000/packs/${packId}/print?lang=${lang}&mode=${mode}`, { waitUntil: "load", timeout: 180000 });
const sections = await p.$$("section.print-page");
let i = 0;
for (const s of sections.slice(0, 7)) {
  await s.scrollIntoViewIfNeeded();
  await s.screenshot({ path: `${out}/print-${lang}-${mode}-${i++}.png` });
}
console.log("sections", sections.length, "captured", i);
await b.close();
