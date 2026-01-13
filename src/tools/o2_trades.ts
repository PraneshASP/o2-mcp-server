import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  marketId: z.string().describe("Market ID to fetch trades for."),
  startTimestamp: z
    .union([z.number(), z.string()])
    .describe("Start timestamp for pagination (optional).")
    .optional(),
  startTradeId: z
    .string()
    .describe("Start trade ID for pagination (optional).")
    .optional(),
  direction: z
    .enum(["forward", "backward"])
    .describe("Pagination direction (optional, default: backward).")
    .optional(),
  count: z
    .number()
    .describe("Number of trades to return (optional, max 50).")
    .optional(),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_trades",
  description:
    "Get recent trade history for a market with pagination support. Returns up to 50 trades per request.",
  annotations: {
    title: "Market trades",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2Trades({
  marketId,
  startTimestamp,
  startTradeId,
  direction,
  count,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  try {
    const response = await o2RequestRaw({
      method: "GET",
      path: "/v1/trades",
      query: {
        market_id: marketId,
        start_timestamp: startTimestamp,
        start_trade_id: startTradeId,
        direction,
        count,
      },
      apiBaseUrl,
    });

    return toToolResponse({
      ok: response.ok,
      data: response.data,
    });
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
