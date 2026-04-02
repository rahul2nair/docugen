import { config } from "@/server/config";
import { logError, logInfo, logWarn } from "@/server/logger";
import { renderHtmlToPdfLocal, type PdfOptions } from "@/server/pdf-local";

function rendererTimeoutMs() {
  return Number.isNaN(config.pdfRenderer.timeoutMs) || config.pdfRenderer.timeoutMs <= 0
    ? 45000
    : config.pdfRenderer.timeoutMs;
}

async function renderWithRemoteRenderer(html: string, opts?: PdfOptions) {
  const endpoint = config.pdfRenderer.endpoint.trim();
  if (!endpoint) {
    throw new Error("Remote PDF renderer endpoint is not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), rendererTimeoutMs());

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.pdfRenderer.authToken
          ? { "x-renderer-token": config.pdfRenderer.authToken }
          : {})
      },
      body: JSON.stringify({ html, options: opts || {} }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`Remote renderer failed with ${response.status}: ${errorBody.slice(0, 4000)}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = Buffer.from(bytes);

    logInfo("pdf_generated_remote", {
      endpoint,
      format: opts?.format || "A4",
      margin: opts?.margin || "normal",
      bytes: pdf.length
    });
    return pdf;
  } catch (error) {
    logError("pdf_generation_failed_remote", error, {
      endpoint,
      format: opts?.format || "A4",
      margin: opts?.margin || "normal"
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function htmlToPdf(html: string, opts?: PdfOptions) {
  const hasRemoteRenderer = Boolean(config.pdfRenderer.endpoint.trim());

  if (hasRemoteRenderer) {
    try {
      return await renderWithRemoteRenderer(html, opts);
    } catch (error) {
      if (!config.pdfRenderer.fallbackToLocal) {
        throw error;
      }

      logWarn("pdf_remote_renderer_fallback_to_local", {
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return renderHtmlToPdfLocal(html, opts);
}
