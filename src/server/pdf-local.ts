import { chromium } from "playwright";
import { logError, logInfo } from "@/server/logger";

export interface PdfOptions {
  format?: "A4" | "Letter";
  margin?: "normal" | "narrow";
}

export async function renderHtmlToPdfLocal(html: string, opts?: PdfOptions) {
  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ];

  try {
    const browser = await chromium.launch({
      headless: true,
      args: launchArgs
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

      const margin =
        opts?.margin === "narrow"
          ? { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" }
          : { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm" };

      const pdf = await page.pdf({
        format: opts?.format || "A4",
        printBackground: true,
        margin
      });

      logInfo("pdf_generated_local", {
        format: opts?.format || "A4",
        margin: opts?.margin || "normal",
        bytes: pdf.length
      });
      console.log(`✅ PDF generated locally (${pdf.length} bytes)`);
      return pdf;
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingLibMatch = message.match(/error while loading shared libraries:\s*([^:\s]+)(?::|\s)/i);
    const missingLibrary = missingLibMatch?.[1];

    logError("pdf_generation_failed_local", error, {
      format: opts?.format || "A4",
      margin: opts?.margin || "normal",
      missingLibrary,
      hint: missingLibrary
        ? "Install Playwright runtime dependencies in the renderer image"
        : undefined
    });

    if (missingLibrary) {
      console.error(`❌ PDF generation failed: missing shared library ${missingLibrary}`);
      console.error("   Hint: ensure the renderer image installs Playwright system dependencies.");
    } else {
      console.error("❌ PDF generation error:", message);
    }
    throw error;
  }
}