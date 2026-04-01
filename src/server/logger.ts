type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: unknown;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    message: typeof error === "string" ? error : JSON.stringify(error)
  };
}

function writeLog(level: LogLevel, event: string, meta?: LogMeta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(meta ? { meta } : {})
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, meta?: LogMeta) {
  writeLog("info", event, meta);
}

export function logWarn(event: string, meta?: LogMeta) {
  writeLog("warn", event, meta);
}

export function logError(event: string, error?: unknown, meta?: LogMeta) {
  writeLog("error", event, {
    ...(meta || {}),
    ...(typeof error === "undefined" ? {} : { error: normalizeError(error) })
  });
}
