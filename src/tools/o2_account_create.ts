import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  ownerAddress: z.string().describe("Owner wallet address."),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_account_create",
  description: "Create a new trading account.",
  annotations: {
    title: "Create trading account",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};

export default async function o2AccountCreate({
  ownerAddress,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  const response = await o2RequestRaw({
    method: "POST",
    path: "/v1/accounts",
    body: {
      identity: {
        Address: ownerAddress,
      },
    },
    apiBaseUrl,
  });

  const data = response.data as Record<string, unknown> | undefined;

  return toToolResponse({
    ok: response.ok,
    trade_account_id: data?.trade_account_id ?? data?.tradeAccountId,
    nonce: data?.nonce,
  });
}
