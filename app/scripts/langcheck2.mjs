import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text().slice(0, 200)); });
await p.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle", timeout: 120000 });
await p.waitForTimeout(6000);
await p.click(".lang-trigger"); await p.waitForTimeout(800);
console.log("aria-expanded after click:", await p.$eval(".lang-trigger", (el) => el.getAttribute("aria-expanded")), "| menu:", !!(await p.$(".lang-menu")));
if (await p.$(".lang-menu")) {
  await p.screenshot({ path: `${out}/dropdown-open.png`, clip: { x: 800, y: 0, width: 640, height: 260 } });
  await p.click(".lang-item:nth-child(2)"); await p.waitForTimeout(3000);
  console.log("after switch: lang =", await p.evaluate(() => document.documentElement.lang), "dir =", await p.evaluate(() => document.documentElement.dir));
}
await b.close();
