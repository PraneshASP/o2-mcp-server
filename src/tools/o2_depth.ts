import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  marketId: z.string().describe("Market ID to fetch depth for."),
  precision: z
    .union([z.number(), z.string()])
    .describe("Depth precision value."),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_depth",
  description: "Get order book depth (bids/asks) for a market.",
  annotations: {
    title: "Order book depth",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2Depth({
  marketId,
  precision,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  const response = await o2RequestRaw({
    method: "GET",
    path: "/v1/depth",
    query: {
      market_id: marketId,
      precision,
    },
    apiBaseUrl,
  });

  const data = response.data as Record<string, unknown> | undefined;
  const orders = data?.orders as Record<string, unknown> | undefined;

  return toToolResponse({
    ok: response.ok,
    market_id: (data?.market_id ?? marketId) as string | undefined,
    buys: orders?.buys ?? [],
    sells: orders?.sells ?? [],
  });
}
