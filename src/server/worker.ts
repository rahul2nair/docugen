import "dotenv/config";
import { Worker } from "bullmq";
import { logError, logInfo, logWarn } from "@/server/logger";
import { builtinTemplates } from "@/server/templates";
import { connection, generationQueue } from "@/server/queue";
import { config } from "@/server/config";
import { buildDownloadFilename, deriveGeneratedFileLabel } from "@/server/generated-file-name";
import { renderRequest } from "@/server/render";
import { saveOutput, outputUrl } from "@/server/output-store";
import { cleanupExpiredGeneratedFiles } from "@/server/my-files-store";
import { htmlToPdf } from "@/server/pdf";
import { saveGeneratedFileByOwnerKey } from "@/server/user-data-store";
import type { GenerationRequest, GenerationResult } from "@/server/types";

function computeMyFilesExpiry() {
  const retentionDays = Number.isNaN(config.myFilesRetentionDays) || config.myFilesRetentionDays <= 0
    ? 30
    : config.myFilesRetentionDays;

  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

function encodeEphemeralOutput(content: Buffer | string, format: "html" | "pdf", label: string) {
  const buffer = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const fileName = buildDownloadFilename(label, format);

  return {
    bodyBase64: buffer.toString("base64"),
    contentType: format === "html" ? "text/html; charset=utf-8" : "application/pdf",
    contentDisposition:
      format === "pdf"
        ? `attachment; filename="${fileName}"`
        : `inline; filename="${fileName}"`
  };
}

const worker = new Worker(
  "document-generation",
  async (job) => {
    if (job.name === "cleanup-my-files") {
      try {
        const result = await cleanupExpiredGeneratedFiles();
        logInfo("my_files_cleanup_completed", {
          cleaned: result.cleaned
        });
        console.log(`🧹 My Files cleanup removed ${result.cleaned} expired file(s)`);
        return result;
      } catch (error) {
        logError("my_files_cleanup_failed", error);
        throw error;
      }
    }

    console.log(`\n⚙️  Processing job ${job.id}...`);
    logInfo("job_processing_started", {
      jobId: String(job.id)
    });

    try {
      const request = job.data as GenerationRequest;
      console.log(`📋 Mode: ${request.mode}, Outputs: ${request.outputs.join(", ")}`);
      const builtinTemplateId = request.templateSource?.type === "builtin"
        ? request.templateSource.templateId
        : undefined;
      const builtinTemplateName = builtinTemplateId
        ? builtinTemplates.find((item) => item.id === builtinTemplateId)?.name
        : undefined;
      const fileLabel = deriveGeneratedFileLabel(request, builtinTemplateName);
      logInfo("job_details", {
        jobId: String(job.id),
        mode: request.mode,
        outputs: request.outputs,
        hasOwnerKey: Boolean(request.persistence?.ownerKey),
        fileLabel
      });

      const rendered = await renderRequest(request);
      console.log(`✅ Template rendered successfully`);
      logInfo("job_render_completed", {
        jobId: String(job.id)
      });

      const outputs: GenerationResult["outputs"] = [];
      const shouldPersistOutputs = Boolean(request.persistence?.ownerKey);
      const ephemeralOutputs: Partial<Record<"html" | "pdf", ReturnType<typeof encodeEphemeralOutput>>> = {};

      if (rendered.html && request.outputs.includes("html")) {
        try {
          if (shouldPersistOutputs) {
            console.log(`📝 Saving HTML output...`);
            await saveOutput(request.persistence!.ownerKey, job.id!, "html", rendered.html);
            logInfo("job_html_saved", {
              jobId: String(job.id)
            });
          } else {
            ephemeralOutputs.html = encodeEphemeralOutput(rendered.html, "html", fileLabel);
          }
          outputs.push(outputUrl(job.id!, "html"));
        } catch (error) {
          logError("job_html_save_failed", error, {
            jobId: String(job.id)
          });
          throw error;
        }
      }

      if (rendered.html && request.outputs.includes("pdf")) {
        try {
          console.log(`📄 Converting to PDF...`);
          const pdf = await htmlToPdf(rendered.html, request.options?.pdf);
          logInfo("job_pdf_conversion_completed", {
            jobId: String(job.id)
          });

          if (shouldPersistOutputs) {
            console.log(`💾 Saving PDF output...`);
            await saveOutput(request.persistence!.ownerKey, job.id!, "pdf", pdf);
            logInfo("job_pdf_saved", {
              jobId: String(job.id)
            });
          } else {
            ephemeralOutputs.pdf = encodeEphemeralOutput(pdf, "pdf", fileLabel);
          }
          outputs.push(outputUrl(job.id!, "pdf"));
        } catch (error) {
          const hasHtmlOutput = outputs.some((item) => item.format === "html");

          logError("job_pdf_processing_failed", error, {
            jobId: String(job.id)
          });

          if (hasHtmlOutput) {
            const reason = error instanceof Error ? error.message : String(error);
            logWarn("job_pdf_failed_continuing_with_html", {
              jobId: String(job.id),
              reason
            });
            console.warn(`⚠️  PDF failed for job ${job.id}; continuing with HTML output only`);
          } else {
            throw error;
          }
        }
      }

      if (shouldPersistOutputs && request.persistence?.ownerKey && job.id && outputs.length) {
        try {
          await saveGeneratedFileByOwnerKey(request.persistence.ownerKey, {
            jobId: String(job.id),
            label: fileLabel,
            templateId: builtinTemplateId,
            templateName: builtinTemplateName,
            availableFormats: outputs.map((item) => item.format),
            expiresAt: computeMyFilesExpiry()
          });

          logInfo("job_persisted_to_my_files", {
            jobId: String(job.id),
            ownerKey: request.persistence.ownerKey,
            formats: outputs.map((item) => item.format)
          });
        } catch (error) {
          logError("job_my_files_persistence_failed", error, {
            jobId: String(job.id),
            ownerKey: request.persistence.ownerKey
          });
          throw error;
        }
      }

      console.log(`✅ Job ${job.id} completed successfully\n`);
      logInfo("job_completed_successfully", {
        jobId: String(job.id),
        outputCount: outputs.length
      });

      return {
        outputs,
        html: rendered.html,
        ...(Object.keys(ephemeralOutputs).length ? { ephemeralOutputs } : {}),
        session: request.session
          ? {
              id: request.session.id,
              revision: request.session.revision
            }
          : undefined
      };
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error instanceof Error ? error.message : error);
      logError("job_processing_failed", error, {
        jobId: String(job.id)
      });
      throw error;
    }
  },
  {
    connection,
    concurrency:
      Number.isNaN(config.worker.concurrency) || config.worker.concurrency <= 0
        ? 1
        : config.worker.concurrency
  }
);

async function scheduleMaintenanceJobs() {
  const cleanupIntervalMinutes =
    Number.isNaN(config.myFilesCleanupIntervalMinutes) || config.myFilesCleanupIntervalMinutes <= 0
      ? 360
      : config.myFilesCleanupIntervalMinutes;

  await generationQueue.add(
    "cleanup-my-files",
    {},
    {
      jobId: "cleanup-my-files-recurring",
      repeat: {
        every: cleanupIntervalMinutes * 60 * 1000
      },
      removeOnComplete: true,
      removeOnFail: {
        age: config.jobRetentionHours * 60 * 60
      }
    }
  );

  console.log(`🗓️  Scheduled My Files cleanup every ${cleanupIntervalMinutes} minute(s)`);
  logInfo("my_files_cleanup_scheduled", {
    intervalMinutes: cleanupIntervalMinutes
  });
}

// Error handlers
worker.on("failed", (job, error) => {
  console.error(`\n❌ Job ${job?.id} failed (after 3 retries):`);
  console.error(`   Reason: ${error.message}\n`);
  logError("job_failed_after_retries", error, {
    jobId: String(job?.id)
  });
});

worker.on("error", (error) => {
  console.error(`\n❌ Worker error:`, error.message);
  logError("worker_error", error);
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

const workerConcurrency =
  Number.isNaN(config.worker.concurrency) || config.worker.concurrency <= 0
    ? 1
    : config.worker.concurrency;

console.log(`🚀 Worker started: document-generation (concurrency: ${workerConcurrency})`);
logInfo("worker_started", {
  concurrency: workerConcurrency,
  remotePdfRendererEnabled: Boolean(config.pdfRenderer.endpoint.trim())
});

scheduleMaintenanceJobs().catch((error) => {
  console.error("❌ Failed to schedule My Files cleanup:", error instanceof Error ? error.message : error);
  logError("maintenance_job_schedule_failed", error);
});
