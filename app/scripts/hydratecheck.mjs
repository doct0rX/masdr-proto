import { chromium } from "playwright";
const b = await chromium.launch();
for (const path of ["/", "/packs"]) {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const logs = [];
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 300)));
  p.on("console", (m) => { if (!m.text().includes("hmr")) logs.push(m.type() + ": " + m.text().slice(0, 300)); });
  await p.goto(`http://127.0.0.1:3000${path}`, { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(12000);
  const hydrated = await p.$eval(".lang-trigger", (el) => Object.keys(el).some((k) => k.startsWith("__reactFiber")));
  console.log(`\n=== ${path} hydrated: ${hydrated}`);
  console.log(logs.slice(0, 8).join("\n") || "no console output");
}
await b.close();
