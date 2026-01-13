import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { placeOrderWithSdk, placeOrderWithRestApi } from "../lib/o2-sdk";
import { toToolResponse } from "../lib/o2-response";
import { getSessionPrivateKey } from "../lib/o2-session-store";

export const schema = {
  tradeAccountId: z.string().describe("Trading account contract ID."),
  pair: z
    .tuple([z.string(), z.string()])
    .describe("Market pair symbols [BASE, QUOTE]."),
  sessionId: z
    .string()
    .describe("Session ID from stored sessions."),
  side: z.enum(["Buy", "Sell"]).describe("Order side."),
  orderType: z
    .enum(["Spot", "Market", "FillOrKill", "PostOnly"])
    .describe("Order type: Spot (default), Market, FillOrKill, or PostOnly (optional).")
    .optional(),
  rawPrice: z
    .union([z.number(), z.string()])
    .describe("Human-readable price (e.g., '1.50' for 1.50 USDC per token). Auto-scales using market metadata. Use this OR price, not both.")
    .optional(),
  rawQuantity: z
    .union([z.number(), z.string()])
    .describe("Human-readable order value in quote asset (e.g., '5.0' for 5 USDC worth). Auto-scales using market metadata. Use this OR quantity, not both.")
    .optional(),
  price: z
    .union([z.number(), z.string()])
    .describe("Price in base units (pre-scaled integer). Use this OR rawPrice, not both.")
    .optional(),
  quantity: z
    .union([z.number(), z.string()])
    .describe("Quantity in base units (pre-scaled integer). Use this OR rawQuantity, not both.")
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
  name: "o2_place_order",
  description: "Place a single order using the session key. Supports 4 order types: Spot (default), Market, FillOrKill, PostOnly. Supports auto-scaling with rawPrice/rawQuantity (human-readable values like '1.50') or pre-scaled price/quantity (integer values). Use the RestAPI implementation for auto-scaling or the SDK for pre-scaled values.",
  annotations: {
    title: "Place order",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
  },
};

export default async function o2PlaceOrder({
  tradeAccountId,
  pair,
  sessionId,
  side,
  orderType,
  rawPrice,
  rawQuantity,
  price,
  quantity,
  apiBaseUrl,
  providerUrl,
  sessionStorePath,
}: InferSchema<typeof schema>) {
  const resolvedSessionKey = await getSessionPrivateKey(sessionId, sessionStorePath);

  const useRawValues = rawPrice !== undefined && rawQuantity !== undefined;
  const useScaledValues = price !== undefined && quantity !== undefined;

  if (!useRawValues && !useScaledValues) {
    throw new Error("Either (rawPrice and rawQuantity) or (price and quantity) must be provided");
  }

  if (useRawValues && useScaledValues) {
    throw new Error("Cannot use both raw and pre-scaled values. Use either (rawPrice and rawQuantity) OR (price and quantity)");
  }

  let result: any;

  if (useRawValues) {
    result = await placeOrderWithRestApi({
      tradeAccountId,
      pair,
      sessionPrivateKey: resolvedSessionKey,
      side,
      orderType,
      rawPrice,
      rawQuantity,
      apiBaseUrl,
      providerUrl,
    });
  } else {
    result = await placeOrderWithSdk({
      tradeAccountId,
      pair,
      sessionPrivateKey: resolvedSessionKey,
      side,
      orderType,
      price: price!,
      quantity: quantity!,
      apiBaseUrl,
      providerUrl,
    });
  }

  const response = result.response as {
    tx_id?: string;
    orders?: Array<Record<string, unknown>>;
  };

  const orderIds = Array.isArray(response?.orders)
    ? response.orders
        .map((order) => order.order_id as string | undefined)
        .filter((orderId) => orderId)
    : [];

  return toToolResponse({
    ok: true,
    tx_id: response?.tx_id,
    order_ids: orderIds,
    ...(result.scaledPrice && { scaled_price: result.scaledPrice }),
    ...(result.scaledQuantity && { scaled_quantity: result.scaledQuantity }),
  });
}
