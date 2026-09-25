import { getMcpClient, resetMcpClient, errorMessage } from "./mcp.js";

export class ToolError extends Error {
  constructor(
    public readonly tool: string,
    message: string,
  ) {
    super(`${tool} failed: ${message}`);
    this.name = "ToolError";
  }
}

interface ContentItem {
  type?: string;
  text?: string;
}

function parseResult(name: string, result: unknown): unknown {
  const r = (result ?? {}) as {
    isError?: boolean;
    content?: ContentItem[];
    structuredContent?: unknown;
  };
  const texts = (r.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string);
  const text = texts.join("\n");
  if (r.isError) {
    throw new ToolError(name, text || "tool reported an error");
  }
  if (r.structuredContent !== undefined && r.structuredContent !== null) return r.structuredContent;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isTransportError(err: unknown): boolean {
  if (err instanceof ToolError) return false;
  const m = err instanceof Error ? err.message : String(err);
  return /not connected|connection|fetch failed|ECONN|socket|session|closed|transport|stream|terminated|timeout/i.test(m);
}

/**
 * Call a tool by exact name. Text content is parsed as JSON when possible.
 * Errors are rethrown as ToolError("<tool> failed: <message>") with keys stripped.
 * Reconnects once on a transport error.
 */
export async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const attempt = async (): Promise<unknown> => {
    const client = await getMcpClient();
    const result = await client.callTool({ name, arguments: args });
    return parseResult(name, result);
  };
  try {
    return await attempt();
  } catch (err) {
    if (isTransportError(err)) {
      resetMcpClient();
      try {
        return await attempt();
      } catch (err2) {
        throw toToolError(name, err2);
      }
    }
    throw toToolError(name, err);
  }
}

function toToolError(name: string, err: unknown): ToolError {
  if (err instanceof ToolError) return err;
  return new ToolError(name, errorMessage(err));
}
