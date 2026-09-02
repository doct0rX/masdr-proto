import { chromium, type Browser } from "playwright";
import { ACCESS_COOKIE, accessCodeConfigured, expectedAccessToken } from "@/lib/access";

const g = globalThis as unknown as { __masdrBrowser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  if (!g.__masdrBrowser) {
    g.__masdrBrowser = chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }).then((b) => {
      b.on("disconnected", () => {
        g.__masdrBrowser = undefined;
      });
      return b;
    });
  }
  return g.__masdrBrowser;
}

function baseUrl(): string {
  return process.env.INTERNAL_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}

/**
 * Renders the print page of a tech pack to A4 landscape PDF with headless
 * Chromium, so Arabic shaping, fonts and SVG flats match the web view exactly.
 */
export async function renderPackPdf(packId: string, lang: "en" | "ar", mode: "full" | "sample_room" = "full"): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({ locale: lang === "ar" ? "ar-EG" : "en-GB", deviceScaleFactor: 2 });
  try {
    if (accessCodeConfigured()) {
      await context.addCookies([{ name: ACCESS_COOKIE, value: await expectedAccessToken(), url: baseUrl() }]);
    }
    const page = await context.newPage();
    await page.goto(`${baseUrl()}/packs/${packId}/print?lang=${lang}&mode=${mode}`, { waitUntil: "networkidle", timeout: 90_000 });
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "10mm", bottom: "12mm", left: "10mm", right: "10mm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate:
        '<div style="font-size:7.5px;width:100%;text-align:center;color:#6B7280;font-family:Arial,sans-serif;padding:0 10mm">Masdr Tech Pack · <span class="title"></span> · page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    });
    return Buffer.from(pdf);
  } finally {
    await context.close();
  }
}
