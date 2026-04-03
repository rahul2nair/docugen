import { deleteOutput } from "@/server/output-store";
import {
  listGeneratedFilesByOwnerKey,
  deleteGeneratedFileById,
  deleteGeneratedFileByIdAndOwnerKey,
  getGeneratedFileByIdAndOwnerKey,
  listExpiredGeneratedFiles,
  listExpiredGeneratedFilesByOwnerKey,
  type StoredGeneratedFile
} from "@/server/user-data-store";

async function deleteOutputsForFile(file: StoredGeneratedFile) {
  await Promise.all(
    file.availableFormats.map(async (format) => {
      try {
        await deleteOutput(file.ownerKey, file.jobId, format);
      } catch (error) {
        console.error(
          `Failed to delete stored output ${file.jobId}.${format}:`,
          error instanceof Error ? error.message : error
        );
      }
    })
  );
}

export async function cleanupExpiredGeneratedFilesByOwnerKey(ownerKey: string) {
  const expiredFiles = await listExpiredGeneratedFilesByOwnerKey(ownerKey, 200);

  if (!expiredFiles.length) {
    return { cleaned: 0 };
  }

  for (const file of expiredFiles) {
    await deleteOutputsForFile(file);
    await deleteGeneratedFileByIdAndOwnerKey(ownerKey, file.id);
  }

  return { cleaned: expiredFiles.length };
}

export async function cleanupExpiredGeneratedFiles(limit = 200) {
  const expiredFiles = await listExpiredGeneratedFiles(limit);

  if (!expiredFiles.length) {
    return { cleaned: 0 };
  }

  for (const file of expiredFiles) {
    await deleteOutputsForFile(file);
    await deleteGeneratedFileById(file.id);
  }

  return { cleaned: expiredFiles.length };
}

export async function deleteGeneratedFileForOwner(ownerKey: string, fileId: string) {
  const file = await getGeneratedFileByIdAndOwnerKey(ownerKey, fileId);

  if (!file) {
    return null;
  }

  await deleteOutputsForFile(file);
  await deleteGeneratedFileByIdAndOwnerKey(ownerKey, fileId);
  return file;
}

export async function purgeGeneratedFilesForOwner(ownerKey: string) {
  let purged = 0;

  while (true) {
    const files = await listGeneratedFilesByOwnerKey(ownerKey, {
      includeExpired: true,
      limit: 200
    });

    if (!files.length) {
      break;
    }

    for (const file of files) {
      await deleteOutputsForFile(file);
      await deleteGeneratedFileByIdAndOwnerKey(ownerKey, file.id);
      purged += 1;
    }
  }

  return { purged };
}