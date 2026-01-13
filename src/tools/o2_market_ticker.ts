import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  marketId: z
    .string()
    .describe("Market ID to fetch ticker data for (omit for all).")
    .optional(),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_market_ticker",
  description: "Get real-time market ticker data.",
  annotations: {
    title: "Market ticker",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2MarketTicker({
  marketId,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  const response = await o2RequestRaw({
    method: "GET",
    path: "/v1/markets/ticker",
    query: {
      market_id: marketId,
    },
    apiBaseUrl,
  });

  const data = response.data as { tickers?: unknown[] } | unknown[] | undefined;
  const tickersArray = Array.isArray(data)
    ? data
    : Array.isArray(data?.tickers)
      ? data?.tickers
      : [];

  const tickers = tickersArray
    .map((ticker) => {
      const record = ticker as Record<string, unknown>;
      return {
        market_id: (record.market_id ?? record.marketId ?? marketId) as string | undefined,
        last_price: (record.last_price ?? record.last) as
          | string
          | number
          | undefined,
        volume_24h: (record.volume_24h ?? record.volume ?? record.base_volume) as
          | string
          | number
          | undefined,
        price_change_pct: (record.price_change_pct ??
          record.price_change_percent ??
          record.change_pct ??
          record.percentage) as string | number | undefined,
      };
    })
    .filter((ticker) => ticker.market_id);

  return toToolResponse({
    ok: response.ok,
    tickers,
  });
}
