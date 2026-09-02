import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:3000/", { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(1500);
const restBorder = await p.$eval(".lang-trigger", (el) => getComputedStyle(el).borderColor);
await p.hover(".lang-trigger"); await p.waitForTimeout(300);
const hoverBorder = await p.$eval(".lang-trigger", (el) => getComputedStyle(el).borderColor);
await p.click(".lang-trigger"); await p.waitForTimeout(500);
const menu = await p.$(".lang-menu");
console.log("rest border:", restBorder, "| hover border:", hoverBorder, "| menu rendered:", !!menu);
if (menu) {
  const box = await menu.boundingBox(); console.log("menu box:", box);
  await p.screenshot({ path: `${out}/dropdown-open.png`, clip: { x: 800, y: 0, width: 640, height: 260 } });
  await p.click(".lang-item:nth-child(2)");
  await p.waitForTimeout(2500);
  console.log("after switch: lang =", await p.evaluate(() => document.documentElement.lang), "dir =", await p.evaluate(() => document.documentElement.dir));
  await p.screenshot({ path: `${out}/after-switch.png` });
}
await b.close();
