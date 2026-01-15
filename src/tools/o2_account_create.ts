import { z } from "zod";
import { type ToolMetadata, type InferSchema } from "xmcp";
import { o2RequestRaw } from "../lib/o2-api";
import { toToolResponse } from "../lib/o2-response";
import { Provider, Wallet } from "fuels";
import { resolveOwnerPrivateKey, resolveProviderUrl } from "../lib/o2-config";

export const schema = {
  ownerAddress: z.string().describe("Owner wallet address (optional, derived from O2_PRIVATE_KEY if not provided).").optional(),
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
  providerUrl,
}: InferSchema<typeof schema>) {
  let finalOwnerAddress = ownerAddress;

  if (!finalOwnerAddress) {
    const ownerPrivateKey = resolveOwnerPrivateKey();
    if (!ownerPrivateKey) {
      throw new Error(
        "Owner address not provided and O2_PRIVATE_KEY environment variable is not set. Please provide ownerAddress or set O2_PRIVATE_KEY."
      );
    }

    const resolvedProviderUrl = resolveProviderUrl(providerUrl);
    const provider = new Provider(resolvedProviderUrl);
    await provider.init();
    const ownerWallet = Wallet.fromPrivateKey(ownerPrivateKey, provider);
    finalOwnerAddress = ownerWallet.address.toString();
  }

  const response = await o2RequestRaw({
    method: "POST",
    path: "/v1/accounts",
    body: {
      identity: {
        Address: finalOwnerAddress,
      },
    },
    apiBaseUrl,
  });

  const data = response.data as Record<string, unknown> | undefined;

  return toToolResponse({
    ok: response.ok,
    trade_account_id: data?.trade_account_id ?? data?.tradeAccountId,
    nonce: data?.nonce,
    owner_address: finalOwnerAddress,
  });
}
