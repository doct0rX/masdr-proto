// Single viewport screenshot: node scripts/shot.mjs <path> <out.png> [lang]
import { chromium } from "playwright";
const [path, out, lang = "en"] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
await ctx.addCookies([{ name: "masdr_lang", value: lang, url: "http://127.0.0.1:3000" }]);
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:3000${path}`, { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(Number(process.env.WAIT_MS ?? 2500));
await p.screenshot({ path: out });
await b.close();
console.log("saved", out);
