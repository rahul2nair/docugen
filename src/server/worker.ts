import "dotenv/config";
import { Worker } from "bullmq";
import { builtinTemplates } from "@/server/templates";
import { connection, generationQueue } from "@/server/queue";
import { config } from "@/server/config";
import { renderRequest } from "@/server/render";
import { saveOutput, outputUrl } from "@/server/output-store";
import { cleanupExpiredGeneratedFiles } from "@/server/my-files-store";
import { htmlToPdf } from "@/server/pdf";
import { saveGeneratedFileByOwnerKey } from "@/server/user-data-store";
import type { GenerationRequest, GenerationResult } from "@/server/types";

function deriveFileLabel(request: GenerationRequest) {
  if (request.options?.documentType?.trim()) {
    return request.options.documentType.trim();
  }

  if (request.templateSource?.type === "builtin") {
    const templateId = request.templateSource.templateId;
    const template = builtinTemplates.find((item) => item.id === templateId);
    return template?.name || templateId;
  }

  if (request.mode === "draft_to_document") {
    return "Drafted Document";
  }

  return "Generated Document";
}

function computeMyFilesExpiry() {
  const retentionDays = Number.isNaN(config.myFilesRetentionDays) || config.myFilesRetentionDays <= 0
    ? 30
    : config.myFilesRetentionDays;

  return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
}

const worker = new Worker(
  "document-generation",
  async (job) => {
    if (job.name === "cleanup-my-files") {
      const result = await cleanupExpiredGeneratedFiles();
      console.log(`🧹 My Files cleanup removed ${result.cleaned} expired file(s)`);
      return result;
    }

    console.log(`\n⚙️  Processing job ${job.id}...`);
    
    try {
      const request = job.data as GenerationRequest;
      console.log(`📋 Mode: ${request.mode}, Outputs: ${request.outputs.join(", ")}`);
      
      const rendered = await renderRequest(request);
      console.log(`✅ Template rendered successfully`);

      const outputs: GenerationResult["outputs"] = [];

      if (rendered.html && request.outputs.includes("html")) {
        console.log(`📝 Saving HTML output...`);
        await saveOutput(job.id!, "html", rendered.html);
        outputs.push(outputUrl(job.id!, "html"));
      }

      if (rendered.html && request.outputs.includes("pdf")) {
        console.log(`📄 Converting to PDF...`);
        const pdf = await htmlToPdf(rendered.html, request.options?.pdf);
        console.log(`💾 Saving PDF output...`);
        await saveOutput(job.id!, "pdf", pdf);
        outputs.push(outputUrl(job.id!, "pdf"));
      }

      if (request.persistence?.ownerKey && job.id && outputs.length) {
        const builtinTemplateId = request.templateSource?.type === "builtin"
          ? request.templateSource.templateId
          : undefined;
        const builtinTemplateName = builtinTemplateId
          ? builtinTemplates.find((item) => item.id === builtinTemplateId)?.name
          : undefined;

        await saveGeneratedFileByOwnerKey(request.persistence.ownerKey, {
          jobId: String(job.id),
          label: deriveFileLabel(request),
          templateId: builtinTemplateId,
          templateName: builtinTemplateName,
          availableFormats: outputs.map((item) => item.format),
          expiresAt: computeMyFilesExpiry()
        });
      }

      console.log(`✅ Job ${job.id} completed successfully\n`);
      return {
        outputs,
        html: rendered.html,
        session: request.session
          ? {
              id: request.session.id,
              revision: request.session.revision
            }
          : undefined
      };
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error instanceof Error ? error.message : error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 3
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
}

// Error handlers
worker.on("failed", (job, error) => {
  console.error(`\n❌ Job ${job?.id} failed (after 3 retries):`);
  console.error(`   Reason: ${error.message}\n`);
});

worker.on("error", (error) => {
  console.error(`\n❌ Worker error:`, error.message);
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

console.log("🚀 Worker started: document-generation (concurrency: 3)");

scheduleMaintenanceJobs().catch((error) => {
  console.error("❌ Failed to schedule My Files cleanup:", error instanceof Error ? error.message : error);
});
