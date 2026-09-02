import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const logs = [];
p.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 300)));
p.on("console", (m) => { if (!m.text().includes("hmr") && m.type() !== "info") logs.push(m.type() + ": " + m.text().slice(0, 400)); });
await p.goto("http://127.0.0.1:3000/", { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const info = await p.evaluate(() => {
  const fiberOn = (el) => !!el && Object.keys(el).some((k) => k.startsWith("__reactFiber") || k.startsWith("__reactContainer"));
  return {
    bodyFiber: fiberOn(document.body), htmlFiber: fiberOn(document.documentElement), langFiber: fiberOn(document.querySelector(".lang-trigger")), formFiber: fiberOn(document.querySelector("form")),
    heads: document.querySelectorAll("head").length, nextF: Array.isArray(window.__next_f) ? window.__next_f.length : null,
    reactRoot: !!document.querySelector("[data-reactroot]") , scriptsLoaded: [...document.scripts].filter((s) => s.src).length,
  };
});
console.log(JSON.stringify(info));
await p.click("text=Use the bucket hat example").catch((e) => logs.push("click failed: " + e.message.slice(0, 100)));
await p.waitForTimeout(3000);
console.log("preview img after example click:", !!(await p.$("img[alt=preview]")));
console.log(logs.slice(0, 10).join("\n") || "no console output");
await b.close();
