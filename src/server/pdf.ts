import { chromium } from "playwright";
import path from "path";

export async function htmlToPdf(html: string, opts?: { format?: "A4" | "Letter"; margin?: "normal" | "narrow"; }) {
  try {
    // Launch with explicit executable paths consideration
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
      
      console.log(`✅ PDF generated successfully (${pdf.length} bytes)`);
      return pdf;
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("❌ PDF generation error:", error instanceof Error ? error.message : error);
    throw error;
  }
}
