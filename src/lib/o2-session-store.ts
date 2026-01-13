import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { resolveSessionStorePath } from "./o2-config";

type StoredSession = {
  sessionId: string;
  sessionPrivateKey: string;
  sessionAddress?: string;
  tradeAccountId?: string;
  createdAt: string;
  expiryMs?: number;
};

type SessionStore = {
  sessions: Record<string, StoredSession>;
};

async function ensureDir(filePath: string) {
  const dirPath = path.dirname(filePath);
  await fs.mkdir(dirPath, { recursive: true });
}

async function readStore(filePath: string): Promise<SessionStore> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as SessionStore;
    if (parsed && typeof parsed === "object" && parsed.sessions) {
      return parsed;
    }
  } catch {
    // Fall through to return empty store.
  }
  return { sessions: {} };
}

async function writeStore(filePath: string, store: SessionStore) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export async function saveSession(params: {
  sessionPrivateKey: string;
  sessionAddress?: string;
  tradeAccountId?: string;
  expiryMs?: number;
  storePath?: string;
}) {
  const storePath = resolveSessionStorePath(params.storePath);
  const store = await readStore(storePath);
  const sessionId = randomUUID();

  store.sessions[sessionId] = {
    sessionId,
    sessionPrivateKey: params.sessionPrivateKey,
    sessionAddress: params.sessionAddress,
    tradeAccountId: params.tradeAccountId,
    createdAt: new Date().toISOString(),
    expiryMs: params.expiryMs,
  };

  await writeStore(storePath, store);

  return { sessionId, storePath };
}

export async function getSession(sessionId: string, storePath?: string) {
  const resolvedPath = resolveSessionStorePath(storePath);
  const store = await readStore(resolvedPath);
  const session = store.sessions[sessionId];
  if (!session) {
    throw new Error(`Session not found for session_id: ${sessionId}`);
  }
  return { session, storePath: resolvedPath };
}

export async function getSessionPrivateKey(
  sessionId: string,
  storePath?: string
) {
  const { session } = await getSession(sessionId, storePath);
  return session.sessionPrivateKey;
}

export async function findValidSessionForTradeAccount(
  tradeAccountId: string,
  storePath?: string
): Promise<StoredSession | null> {
  const resolvedPath = resolveSessionStorePath(storePath);
  const store = await readStore(resolvedPath);

  const now = Date.now();

  for (const session of Object.values(store.sessions)) {
    if (session.tradeAccountId === tradeAccountId) {
      if (session.expiryMs && session.expiryMs > now) {
        return session;
      }
    }
  }

  return null;
}
