import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_markets_list",
  description: "Get the list of available o2 markets.",
  annotations: {
    title: "List o2 markets",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2MarketsList({
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  const response = await o2RequestRaw({
    method: "GET",
    path: "/v1/markets",
    apiBaseUrl,
  });

  const data = response.data as { markets?: unknown[] } | unknown[] | undefined;
  const marketsArray = Array.isArray(data)
    ? data
    : Array.isArray(data?.markets)
      ? data?.markets
      : [];

  const markets = marketsArray
    .map((market) => {
      const record = market as Record<string, unknown>;
      const base = record.base as Record<string, unknown> | undefined;
      const quote = record.quote as Record<string, unknown> | undefined;

      return {
        market_id: (record.market_id ?? record.marketId) as string | undefined,
        base_symbol: (base?.symbol ?? record.base_symbol) as
          | string
          | undefined,
        quote_symbol: (quote?.symbol ?? record.quote_symbol) as
          | string
          | undefined,
      };
    })
    .filter((market) => market.market_id);

  return toToolResponse({
    ok: response.ok,
    markets,
  });
}
