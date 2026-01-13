import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { promises as fs } from "node:fs";
import { resolveSessionStorePath } from "../lib/o2-config";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  sessionStorePath: z
    .string()
    .describe("Override session store path (optional).")
    .optional(),
  includeExpired: z
    .boolean()
    .describe("Include expired sessions in the list (optional, default: false).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_sessions_list",
  description:
    "List all stored trading sessions. Returns session metadata without exposing private keys.",
  annotations: {
    title: "List sessions",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

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

export default async function o2SessionsList({
  sessionStorePath,
  includeExpired = false,
}: InferSchema<typeof schema>) {
  try {
    const storePath = resolveSessionStorePath(sessionStorePath);

    let store: SessionStore;
    try {
      const raw = await fs.readFile(storePath, "utf-8");
      store = JSON.parse(raw) as SessionStore;
    } catch {
      store = { sessions: {} };
    }

    const now = Date.now();
    const sessions = Object.values(store.sessions)
      .filter((session) => {
        if (includeExpired) return true;
        return !session.expiryMs || session.expiryMs > now;
      })
      .map((session) => ({
        sessionId: session.sessionId,
        createdAt: session.createdAt,
        expiryMs: session.expiryMs,
        isActive: session.expiryMs ? session.expiryMs > now : true,
      }));

    return toToolResponse({
      ok: true,
      totalSessions: sessions.length,
      sessions,
    });
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
