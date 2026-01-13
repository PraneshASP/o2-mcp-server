import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { getSession } from "../lib/o2-session-store";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  sessionId: z.string().describe("Session ID to fetch details for."),
  sessionStorePath: z
    .string()
    .describe("Override session store path (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_session_get",
  description:
    "Get detailed information for a specific session by session ID. Returns session metadata including address and trade account ID, but does not expose the private key.",
  annotations: {
    title: "Get session details",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2SessionGet({
  sessionId,
  sessionStorePath,
}: InferSchema<typeof schema>) {
  try {
    const { session, storePath } = await getSession(sessionId, sessionStorePath);

    const now = Date.now();
    const isActive = session.expiryMs ? session.expiryMs > now : true;

    return toToolResponse({
      ok: true,
      storePath,
      session: {
        sessionId: session.sessionId,
        sessionAddress: session.sessionAddress,
        tradeAccountId: session.tradeAccountId,
        createdAt: session.createdAt,
        expiryMs: session.expiryMs,
        isActive,
      },
    });
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
