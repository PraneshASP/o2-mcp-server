import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  assetId: z.string().describe("Asset ID to check balance for."),
  contract: z.string().describe("Trading account contract ID."),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_balance",
  description:
    "Get balance for a specific asset in a trading account. Returns locked, unlocked, and trading account balances. Use markets_list tool to fetch asset_id",
  annotations: {
    title: "Account balance",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2Balance({
  assetId,
  contract,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  try {
    const response = await o2RequestRaw({
      method: "GET",
      path: "/v1/balance",
      query: {
        asset_id: assetId,
        contract,
      },
      apiBaseUrl,
    });

    const data = response.data as Record<string, unknown> | undefined;

    return toToolResponse({
      ok: response.ok,
      order_books: data?.order_books ?? {},
      total_locked: data?.total_locked ?? "0",
      total_unlocked: data?.total_unlocked ?? "0",
      trading_account_balance: data?.trading_account_balance ?? "0",
    });
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
