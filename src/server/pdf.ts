import { chromium } from "playwright";
import { logError, logInfo } from "@/server/logger";

export async function htmlToPdf(html: string, opts?: { format?: "A4" | "Letter"; margin?: "normal" | "narrow"; }) {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
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

      logInfo("pdf_generated", {
        format: opts?.format || "A4",
        margin: opts?.margin || "normal",
        bytes: pdf.length
      });
      console.log(`✅ PDF generated successfully (${pdf.length} bytes)`);
      return pdf;
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missingLibMatch = message.match(/error while loading shared libraries:\s*([^:\s]+)(?::|\s)/i);
    const missingLibrary = missingLibMatch?.[1];

    logError("pdf_generation_failed", error, {
      format: opts?.format || "A4",
      margin: opts?.margin || "normal",
      missingLibrary,
      hint: missingLibrary
        ? "Install Playwright runtime dependencies (e.g. via playwright install --with-deps or apt package mapping) in the worker image"
        : undefined
    });

    if (missingLibrary) {
      console.error(`❌ PDF generation failed: missing shared library ${missingLibrary}`);
      console.error("   Hint: ensure the worker image installs Playwright system dependencies.");
    } else {
      console.error("❌ PDF generation error:", message);
    }
    throw error;
  }
}
