import { createHash } from "crypto";
import { nanoid } from "nanoid";
import { config } from "@/server/config";
import { connection } from "@/server/queue";
import type { WorkspaceSession, WorkspaceSessionState, WorkspaceSnapshot } from "@/server/types";

const DEFAULT_STATE: WorkspaceSessionState = {
  mode: "template_fill",
  outputs: ["html", "pdf"]
};

function ttlSeconds() {
  const ttlHours = Number.isNaN(config.sessionTtlHours) || config.sessionTtlHours <= 0 ? 48 : config.sessionTtlHours;
  return Math.floor(ttlHours * 60 * 60);
}

function snapshotsLimit() {
  return Number.isNaN(config.sessionSnapshotLimit) || config.sessionSnapshotLimit <= 0
    ? 50
    : config.sessionSnapshotLimit;
}

function sessionKey(sessionId: string) {
  return `${config.redisKeyPrefix}:session:${sessionId}`;
}

function tokenKey(token: string) {
  return `${config.redisKeyPrefix}:session-token:${hashToken(token)}`;
}

function snapshotsKey(sessionId: string) {
  return `${config.redisKeyPrefix}:session:${sessionId}:snapshots`;
}

function jobsKey(sessionId: string) {
  return `${config.redisKeyPrefix}:session:${sessionId}:jobs`;
}

interface SessionJobRecord {
  id: string;
  createdAt: string;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function withExpiryDate(seconds: number) {
  const expiresAt = new Date(Date.now() + seconds * 1000);
  return expiresAt.toISOString();
}

export interface SaveStateResult {
  ok: boolean;
  session: WorkspaceSession;
  snapshot?: WorkspaceSnapshot;
  conflict?: {
    currentRevision: number;
    session: WorkspaceSession;
  };
}

export async function createWorkspaceSession(initialState?: WorkspaceSessionState) {
  const sessionId = nanoid(16);
  const token = nanoid(48);
  const createdAt = new Date().toISOString();
  const ttl = ttlSeconds();

  const session: WorkspaceSession = {
    id: sessionId,
    revision: 0,
    createdAt,
    lastAccessedAt: createdAt,
    expiresAt: withExpiryDate(ttl),
    state: initialState || DEFAULT_STATE
  };

  await connection
    .multi()
    .set(sessionKey(sessionId), JSON.stringify(session), "EX", ttl)
    .set(tokenKey(token), sessionId, "EX", ttl)
    .exec();

  return {
    token,
    session,
    shareUrl: `${config.appUrl}/workspace?s=${token}`
  };
}

export async function getSessionByToken(token: string) {
  const sessionId = await connection.get(tokenKey(token));

  if (!sessionId) {
    return null;
  }

  const session = parseJson<WorkspaceSession>(await connection.get(sessionKey(sessionId)));

  if (!session) {
    return null;
  }

  return {
    token,
    session
  };
}

async function updateSessionTtl(sessionId: string, token?: string) {
  const ttl = await connection.ttl(sessionKey(sessionId));
  const ttlToApply = ttl > 0 ? ttl : ttlSeconds();

  await connection.expire(sessionKey(sessionId), ttlToApply);
  await connection.expire(snapshotsKey(sessionId), ttlToApply);
  if (token) {
    await connection.expire(tokenKey(token), ttlToApply);
  }

  return ttlToApply;
}

export async function touchSession(token: string) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const now = new Date().toISOString();
  const ttl = await updateSessionTtl(found.session.id, token);

  const updated: WorkspaceSession = {
    ...found.session,
    lastAccessedAt: now,
    expiresAt: withExpiryDate(ttl)
  };

  await connection.set(sessionKey(found.session.id), JSON.stringify(updated), "EX", ttl);

  return updated;
}

export async function saveSessionState(
  token: string,
  payload: {
    editorId: string;
    baseRevision: number;
    note?: string;
    kind?: WorkspaceSnapshot["kind"];
    createSnapshot?: boolean;
    state: WorkspaceSessionState;
  }
): Promise<SaveStateResult | null> {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const { session } = found;

  if (payload.baseRevision !== session.revision) {
    return {
      ok: false,
      session,
      conflict: {
        currentRevision: session.revision,
        session
      }
    };
  }

  const now = new Date().toISOString();
  const ttl = await updateSessionTtl(session.id, token);
  const nextRevision = session.revision + 1;
  const nextSession: WorkspaceSession = {
    ...session,
    revision: nextRevision,
    lastAccessedAt: now,
    expiresAt: withExpiryDate(ttl),
    state: payload.state
  };

  const snapshot: WorkspaceSnapshot = {
    id: nanoid(14),
    revision: nextRevision,
    createdAt: now,
    editorId: payload.editorId,
    note: payload.note,
    kind: payload.kind || "manual",
    state: payload.state
  };

  const shouldCreateSnapshot = payload.createSnapshot !== false;
  const multi = connection.multi();
  multi.set(sessionKey(session.id), JSON.stringify(nextSession), "EX", ttl);

  if (shouldCreateSnapshot) {
    multi.rpush(snapshotsKey(session.id), JSON.stringify(snapshot));
    multi.ltrim(snapshotsKey(session.id), -snapshotsLimit(), -1);
    multi.expire(snapshotsKey(session.id), ttl);
  }

  await multi.exec();

  return {
    ok: true,
    session: nextSession,
    snapshot: shouldCreateSnapshot ? snapshot : undefined
  };
}

export async function listSnapshots(token: string, limit = snapshotsLimit()) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const raw = await connection.lrange(snapshotsKey(found.session.id), -limit, -1);
  const snapshots = raw
    .map((item) => parseJson<WorkspaceSnapshot>(item))
    .filter((item): item is WorkspaceSnapshot => Boolean(item))
    .reverse();

  return {
    session: found.session,
    snapshots
  };
}

export async function getSnapshotById(token: string, snapshotId: string) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const raw = await connection.lrange(snapshotsKey(found.session.id), 0, -1);

  for (const item of raw) {
    const parsed = parseJson<WorkspaceSnapshot>(item);
    if (parsed?.id === snapshotId) {
      return {
        session: found.session,
        snapshot: parsed
      };
    }
  }

  return {
    session: found.session,
    snapshot: null
  };
}

export async function rotateSessionToken(token: string) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const ttl = await connection.ttl(sessionKey(found.session.id));
  const ttlToApply = ttl > 0 ? ttl : ttlSeconds();
  const nextToken = nanoid(48);

  await connection
    .multi()
    .set(tokenKey(nextToken), found.session.id, "EX", ttlToApply)
    .del(tokenKey(token))
    .exec();

  return {
    token: nextToken,
    shareUrl: `${config.appUrl}/workspace?s=${nextToken}`,
    expiresAt: withExpiryDate(ttlToApply)
  };
}

export async function trackGenerationJobForSession(token: string, jobId: string) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const ttl = await updateSessionTtl(found.session.id, token);

  await connection
    .multi()
    .rpush(
      jobsKey(found.session.id),
      JSON.stringify({
        id: jobId,
        createdAt: new Date().toISOString()
      } satisfies SessionJobRecord)
    )
    .ltrim(jobsKey(found.session.id), -200, -1)
    .expire(jobsKey(found.session.id), ttl)
    .exec();

  return {
    sessionId: found.session.id,
    revision: found.session.revision
  };
}

export async function listSessionJobs(token: string, limit = 50) {
  const found = await getSessionByToken(token);
  if (!found) {
    return null;
  }

  const boundedLimit = Math.max(1, Math.min(limit, 200));
  const raw = await connection.lrange(jobsKey(found.session.id), -boundedLimit, -1);

  const jobs = raw
    .map((item) => {
      const parsed = parseJson<SessionJobRecord>(item);

      if (parsed?.id) {
        return parsed;
      }

      return {
        id: item,
        createdAt: ""
      } satisfies SessionJobRecord;
    })
    .reverse();

  return {
    session: found.session,
    jobs
  };
}
