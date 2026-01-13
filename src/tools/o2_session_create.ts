import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { createSessionWithSdk } from "../lib/o2-sdk";
import { toToolResponse } from "../lib/o2-response";
import { saveSession } from "../lib/o2-session-store";

export const schema = {
  tradeAccountId: z.string().describe("Trading account contract ID."),
  pair: z
    .tuple([z.string(), z.string()])
    .describe("Market pair symbols [BASE, QUOTE]."),
  contractIds: z
    .array(z.string())
    .describe("Contract IDs to whitelist (optional).")
    .optional(),
  expiryMs: z
    .union([z.number(), z.string()])
    .describe("Session expiry timestamp in ms (optional).")
    .optional(),
  ownerNonce: z
    .union([z.number(), z.string()])
    .describe("Owner nonce override (optional).")
    .optional(),
  sessionStorePath: z
    .string()
    .describe("Override session store path (optional).")
    .optional(),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
  providerUrl: z
    .string()
    .describe("Override Fuel provider URL (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_session_create",
  description:
    "Create a trading session using the owner private key from O2_PRIVATE_KEY environment variable.",
  annotations: {
    title: "Create trading session",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function o2SessionCreate({
  tradeAccountId,
  pair,
  contractIds,
  expiryMs,
  ownerNonce,
  sessionStorePath,
  apiBaseUrl,
  providerUrl,
}: InferSchema<typeof schema>) {
  const result = await createSessionWithSdk({
    tradeAccountId,
    pair,
    contractIds,
    expiryMs: expiryMs ? Number(expiryMs) : undefined,
    ownerNonce,
    apiBaseUrl,
    providerUrl,
  });

  const { sessionId } = await saveSession({
    sessionPrivateKey: result.sessionPrivateKey,
    sessionAddress: result.sessionAddress,
    tradeAccountId,
    expiryMs: result.expiryMs,
    storePath: sessionStorePath,
  });

  return toToolResponse({
    ok: true,
    session_id: sessionId,
    session_address: result.sessionAddress,
    expiry_ms: result.expiryMs,
    nonce_used: result.nonceUsed,
    session_generated: result.sessionWasGenerated,
  });
}
