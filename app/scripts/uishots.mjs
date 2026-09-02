import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch();
const shot = async (path, name, lang, opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "masdr_lang", value: lang, url: "http://127.0.0.1:3000" }]);
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:3000${path}`, { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(2500);
  if (opts.hoverLang) { await p.hover(".lang-trigger"); await p.waitForTimeout(400); }
  if (opts.openLang) { await p.click(".lang-trigger"); await p.waitForTimeout(400); }
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: !!opts.full });
  await ctx.close();
};
await shot("/", "new-home-en", "en");
await shot("/", "new-home-en-hover", "en", { hoverLang: true });
await shot("/", "new-home-en-open", "en", { openLang: true });
await shot("/", "new-home-ar", "ar");
await shot("/", "new-home-full", "en", { full: true });
await shot("/packs", "new-packs", "en");
await shot("/packs/tp_c91083bae0be120e", "new-pack", "en");
await b.close();
console.log("done");
