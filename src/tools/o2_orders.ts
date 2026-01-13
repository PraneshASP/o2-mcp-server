import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  marketId: z
    .string()
    .describe("Market ID to filter orders (optional).")
    .optional(),
  account: z
    .string()
    .describe("Account address to filter orders (optional).")
    .optional(),
  contract: z
    .string()
    .describe("Trading account contract ID to filter orders (optional).")
    .optional(),
  startTimestamp: z
    .union([z.number(), z.string()])
    .describe("Start timestamp for pagination (optional).")
    .optional(),
  startOrderId: z
    .string()
    .describe("Start order ID for pagination (optional).")
    .optional(),
  direction: z
    .enum(["forward", "backward"])
    .describe("Pagination direction (optional, default: backward).")
    .optional(),
  count: z
    .number()
    .describe("Number of orders to return (optional).")
    .optional(),
  isOpen: z
    .boolean()
    .describe("Filter for open orders only (optional).")
    .optional(),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_orders",
  description: "Get order history for an account with pagination support.",
  annotations: {
    title: "Orders history",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};

export default async function o2Orders({
  marketId,
  account,
  contract,
  startTimestamp,
  startOrderId,
  direction,
  count,
  isOpen,
  apiBaseUrl,
}: InferSchema<typeof schema>) {
  try {
    const response = await o2RequestRaw({
      method: "GET",
      path: "/v1/orders",
      query: {
        market_id: marketId,
        account,
        contract,
        start_timestamp: startTimestamp,
        start_order_id: startOrderId,
        direction,
        count,
        is_open: isOpen,
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
