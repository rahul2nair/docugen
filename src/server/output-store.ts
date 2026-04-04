import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "@/server/config";
import type { OutputFormat } from "@/server/types";

let s3Client: S3Client | null = null;

function normalizeOwnerSegment(ownerKey: string) {
  if (ownerKey.startsWith("user:")) {
    return ownerKey.slice(5);
  }

  if (ownerKey.startsWith("session:")) {
    return ownerKey.slice(8);
  }

  return ownerKey;
}

function buildOwnerOutputKey(ownerKey: string, jobId: string, format: OutputFormat) {
  const ownerSegment = normalizeOwnerSegment(ownerKey).replace(/[^a-zA-Z0-9._/-]/g, "_");
  return `${ownerSegment}/files/${jobId}.${format}`;
}

function buildLegacyOutputKey(jobId: string, format: OutputFormat) {
  return `documents/${jobId}.${format}`;
}

async function keyExists(key: string) {
  try {
    const s3 = getS3Client();
    await s3.send(
      new HeadObjectCommand({
        Bucket: config.b2.bucket,
        Key: key
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function resolveReadableKey(ownerKey: string, jobId: string, format: OutputFormat) {
  const ownerKeyPath = buildOwnerOutputKey(ownerKey, jobId, format);
  if (await keyExists(ownerKeyPath)) {
    return ownerKeyPath;
  }

  const legacyKey = buildLegacyOutputKey(jobId, format);
  if (await keyExists(legacyKey)) {
    console.warn(`⚠️ Falling back to legacy output key for ${jobId}.${format}: ${legacyKey}`);
    return legacyKey;
  }

  throw new Error(`File not found for owner key path (${ownerKeyPath}) or legacy key (${legacyKey})`);
}

function validateB2Config() {
  if (!config.b2.accessKeyId) {
    throw new Error("B2_KEY_ID is not configured in environment variables");
  }
  if (!config.b2.secretAccessKey) {
    throw new Error("B2_SECRET_KEY is not configured in environment variables");
  }
  if (!config.b2.bucket) {
    throw new Error("B2_BUCKET is not configured in environment variables");
  }
  if (!config.b2.endpoint) {
    throw new Error("B2_ENDPOINT is not configured in environment variables");
  }
}

function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  try {
    validateB2Config();
  } catch (error) {
    console.error("❌ Backblaze B2 Configuration Error:", error instanceof Error ? error.message : error);
    throw error;
  }

  try {
    s3Client = new S3Client({
      region: config.b2.region,
      endpoint: config.b2.endpoint,
      credentials: {
        accessKeyId: config.b2.accessKeyId,
        secretAccessKey: config.b2.secretAccessKey
      }
    });
    console.log("✅ Backblaze B2 S3 client initialized successfully");
    return s3Client;
  } catch (error) {
    console.error("❌ Failed to initialize S3 client:", error);
    throw error;
  }
}

export async function saveOutput(ownerKey: string, jobId: string, format: OutputFormat, content: Buffer | string) {
  try {
    const s3 = getS3Client();

    const key = buildOwnerOutputKey(ownerKey, jobId, format);
    const contentBuffer = typeof content === "string" ? Buffer.from(content) : content;

    console.log(`📤 Uploading ${format} to Backblaze B2: ${key}`);

    const command = new PutObjectCommand({
      Bucket: config.b2.bucket,
      Key: key,
      Body: contentBuffer,
      ContentType: format === "pdf" ? "application/pdf" : "text/html"
    });

    await s3.send(command);
    console.log(`✅ Successfully uploaded ${format} to Backblaze B2`);
    return key;
  } catch (error) {
    console.error(`❌ Error uploading ${format} to Backblaze B2:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function readLegacyOutput(jobId: string, format: OutputFormat) {
  try {
    const s3 = getS3Client();

    const key = buildLegacyOutputKey(jobId, format);

    console.log(`📥 Downloading ${format} from Backblaze B2: ${key}`);

    const command = new GetObjectCommand({
      Bucket: config.b2.bucket,
      Key: key
    });

    const response = await s3.send(command);
    
    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    // Convert the stream to a Buffer
    const chunks: Uint8Array[] = [];
    const reader = response.Body as any;
    
    if (reader[Symbol.asyncIterator]) {
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
    } else if (typeof reader.read === "function") {
      let chunk;
      while ((chunk = reader.read()) !== null) {
        chunks.push(chunk);
      }
    }

    const buffer = Buffer.concat(chunks);
    console.log(`✅ Successfully downloaded ${format} from Backblaze B2 (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    console.error(`❌ Error downloading ${format} from Backblaze B2:`, error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function readOutput(ownerKey: string, jobId: string, format: OutputFormat) {
  const ownerKeyPath = buildOwnerOutputKey(ownerKey, jobId, format);

  try {
    const s3 = getS3Client();

    console.log(`📥 Downloading ${format} from Backblaze B2: ${ownerKeyPath}`);

    const command = new GetObjectCommand({
      Bucket: config.b2.bucket,
      Key: ownerKeyPath
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${ownerKeyPath}`);
    }

    const chunks: Uint8Array[] = [];
    const reader = response.Body as any;

    if (reader[Symbol.asyncIterator]) {
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
    } else if (typeof reader.read === "function") {
      let chunk;
      while ((chunk = reader.read()) !== null) {
        chunks.push(chunk);
      }
    }

    const buffer = Buffer.concat(chunks);
    console.log(`✅ Successfully downloaded ${format} from Backblaze B2 (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    console.warn(
      `⚠️ Failed to read owner-scoped key (${ownerKeyPath}), attempting legacy key fallback`,
      error instanceof Error ? error.message : error
    );
    return readLegacyOutput(jobId, format);
  }
}

export async function deleteOutput(ownerKey: string, jobId: string, format: OutputFormat) {
  try {
    const s3 = getS3Client();
    const ownerKeyPath = buildOwnerOutputKey(ownerKey, jobId, format);

    console.log(`🗑️ Deleting ${format} from Backblaze B2: ${ownerKeyPath}`);

    const command = new DeleteObjectCommand({
      Bucket: config.b2.bucket,
      Key: ownerKeyPath
    });

    await s3.send(command);
    console.log(`✅ Deleted ${format} from Backblaze B2`);
  } catch (error) {
    console.warn(
      `⚠️ Failed to delete owner-scoped key for ${jobId}.${format}, attempting legacy key fallback`,
      error instanceof Error ? error.message : error
    );

    try {
      const s3 = getS3Client();
      const legacyKey = buildLegacyOutputKey(jobId, format);

      const command = new DeleteObjectCommand({
        Bucket: config.b2.bucket,
        Key: legacyKey
      });

      await s3.send(command);
      console.log(`✅ Deleted legacy ${format} output from Backblaze B2`);
    } catch (legacyError) {
      console.error(
        `❌ Error deleting ${format} from Backblaze B2:`,
        legacyError instanceof Error ? legacyError.message : legacyError
      );
      throw legacyError;
    }
  }
}

export async function getOutputSignedDownloadUrl(options: {
  ownerKey: string;
  jobId: string;
  format: OutputFormat;
  fileName: string;
  expiresInSeconds?: number;
}) {
  const { ownerKey, jobId, format, fileName, expiresInSeconds = 120 } = options;
  const key = await resolveReadableKey(ownerKey, jobId, format);
  const s3 = getS3Client();
  const contentType = format === "html" ? "text/html; charset=utf-8" : "application/pdf";
  const contentDisposition =
    format === "pdf"
      ? `attachment; filename="${fileName}"`
      : `inline; filename="${fileName}"`;

  const command = new GetObjectCommand({
    Bucket: config.b2.bucket,
    Key: key,
    ResponseContentType: contentType,
    ResponseContentDisposition: contentDisposition
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export function outputUrl(jobId: string, format: OutputFormat) {
  const expiresAt = new Date(
    Date.now() + config.jobRetentionHours * 60 * 60 * 1000
  ).toISOString();

  return {
    format,
    downloadUrl: `${config.appUrl}/api/v1/generations/${jobId}/outputs/${format}`,
    expiresAt
  };
}
