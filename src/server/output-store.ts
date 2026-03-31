import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "@/server/config";
import type { OutputFormat } from "@/server/types";

let s3Client: S3Client | null = null;

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

export async function saveOutput(jobId: string, format: OutputFormat, content: Buffer | string) {
  try {
    const s3 = getS3Client();
    
    const key = `documents/${jobId}.${format}`;
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

export async function readOutput(jobId: string, format: OutputFormat) {
  try {
    const s3 = getS3Client();
    
    const key = `documents/${jobId}.${format}`;

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

export async function deleteOutput(jobId: string, format: OutputFormat) {
  try {
    const s3 = getS3Client();
    const key = `documents/${jobId}.${format}`;

    console.log(`🗑️ Deleting ${format} from Backblaze B2: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: config.b2.bucket,
      Key: key
    });

    await s3.send(command);
    console.log(`✅ Deleted ${format} from Backblaze B2`);
  } catch (error) {
    console.error(`❌ Error deleting ${format} from Backblaze B2:`, error instanceof Error ? error.message : error);
    throw error;
  }
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
