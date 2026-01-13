import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { cancelOrderWithRestApi } from "../lib/o2-sdk";
import { toToolResponse } from "../lib/o2-response";

export const schema = {
  tradeAccountId: z.string().describe("Trading account contract ID."),
  pair: z
    .tuple([z.string(), z.string()])
    .describe("Market pair symbols [BASE, QUOTE]."),
  orderId: z.string().describe("Order ID to cancel."),
  sessionId: z
    .string()
    .describe("Session ID from stored sessions.")
    .optional(),
  apiBaseUrl: z
    .string()
    .describe("Override base URL for the o2 API (optional).")
    .optional(),
  providerUrl: z
    .string()
    .describe("Override Fuel provider URL (optional).")
    .optional(),
  sessionStorePath: z
    .string()
    .describe("Override session store path (optional).")
    .optional(),
};

export const metadata: ToolMetadata = {
  name: "o2_cancel_order",
  description:
    "Cancel an existing order using the session key. Requires a valid session to be created first.",
  annotations: {
    title: "Cancel order",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
  },
};

export default async function o2CancelOrder({
  tradeAccountId,
  pair,
  orderId,
  apiBaseUrl,
  providerUrl,
}: InferSchema<typeof schema>) {
  try {
    const result = await cancelOrderWithRestApi({
      tradeAccountId,
      pair,
      orderId,
      apiBaseUrl,
      providerUrl,
    });

    const response = result.response as {
      tx_id?: string;
    };

    return toToolResponse({
      ok: true,
      tx_id: response?.tx_id,
      order_id: orderId,
      message: "Order cancellation submitted successfully",
    });
  } catch (error) {
    return toToolResponse({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
