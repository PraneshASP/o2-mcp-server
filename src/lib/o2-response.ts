type ToolContent = {
  type: "text";
  text: string;
};

export type ToolResponse = {
  content: ToolContent[];
  structuredContent: unknown;
};

export function toToolResponse(payload: unknown): ToolResponse {
  let text = "";
  try {
    text =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  } catch {
    text = String(payload);
  }

  return {
    content: [{ type: "text", text }],
    structuredContent: payload,
  };
}
