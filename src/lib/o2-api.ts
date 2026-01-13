import { resolveApiBaseUrl, resolveOwnerId } from "./o2-config";
import { toToolResponse } from "./o2-response";

type QueryValue = string | number | boolean | null | undefined;

type O2RequestOptions = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  ownerId?: string;
  apiBaseUrl?: string;
  requireOwnerId?: boolean;
};

const OWNER_ID_HEADER = "O2-Owner-Id";

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) {
    return "";
  }

  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    entries.push([key, String(value)]);
  }

  if (entries.length === 0) {
    return "";
  }

  return `?${new URLSearchParams(entries).toString()}`;
}


async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type O2RawResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  data: unknown;
};

export async function o2RequestRaw(
  options: O2RequestOptions
): Promise<O2RawResponse> {
  const baseUrl = resolveApiBaseUrl(options.apiBaseUrl);
  const path = normalizePath(options.path);
  const url = `${baseUrl}${path}${buildQuery(options.query)}`;

  const ownerId = resolveOwnerId(options.ownerId);
  if (options.requireOwnerId && !ownerId) {
    throw new Error(
      "O2 owner id is required. Provide ownerId or set O2_OWNER_ID."
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (ownerId) {
    headers[OWNER_ID_HEADER] = ownerId;
  }

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method,
    headers,
    body,
  });

  const data = await parseResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url,
    data,
  };
}

export async function o2Request(options: O2RequestOptions) {
  const payload = await o2RequestRaw(options);
  return toToolResponse(payload);
}
