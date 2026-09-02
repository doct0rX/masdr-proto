// Viewport screenshots of the pack page at several scroll offsets (for QA of tables/flats).
import { chromium } from "playwright";
const [packId, out = "./screens", lang = "en"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies([{ name: "masdr_lang", value: lang, url: "http://127.0.0.1:3000" }]);
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:3000/packs/${packId}`, { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(1500);
for (const id of ["cover", "flats", "poms", "bom", "construction", "colorways", "readiness"]) {
  await p.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/view-${lang}-${id}.png` });
}
await b.close();
console.log("done");
