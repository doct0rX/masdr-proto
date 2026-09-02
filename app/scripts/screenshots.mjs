// Visual QA: capture the main pages. Usage: node scripts/screenshots.mjs <packId> [baseUrl] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
const [packId, base = "http://127.0.0.1:3000", out = "./data/screens"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const shots = [
  ["home-en", "/", "en"],
  ["home-ar", "/", "ar"],
  ["pack-en", `/packs/${packId}`, "en"],
  ["pack-ar", `/packs/${packId}`, "ar"],
  ["print-en", `/packs/${packId}/print?lang=en`, "en"],
  ["print-ar-sample", `/packs/${packId}/print?lang=ar&mode=sample_room`, "ar"],
];
for (const [name, path, lang] of shots) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addCookies([{ name: "masdr_lang", value: lang, url: base }]);
  const page = await ctx.newPage();
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log("saved", `${out}/${name}.png`);
  await ctx.close();
}
await browser.close();
