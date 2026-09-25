import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP client for the Smithery toolbox.
 * - One client per process (cached promise).
 * - On transport error / close the cache is dropped so the next call reconnects.
 * - On first connect we list tools and log ONLY their names.
 * - No URL, key, argument or result is ever logged.
 */

let clientPromise: Promise<Client> | null = null;
let toolCache: Tool[] | null = null;

function toolboxUrl(): URL {
  const raw = process.env.SMITHERY_MCP_URL;
  if (!raw) throw new Error("SMITHERY_MCP_URL is not set");
  return new URL(raw);
}

/** Remove anything that could identify a key or the toolbox URL from a message. */
export function sanitize(message: string): string {
  let out = message;
  const smithery = process.env.SMITHERY_MCP_URL;
  if (smithery) {
    out = out.split(smithery).join("[SMITHERY_MCP_URL]");
    try {
      const key = new URL(smithery).searchParams.get("api_key");
      if (key) out = out.split(key).join("[redacted]");
    } catch {
      /* ignore malformed URL */
    }
  }
  const gemini = process.env.GEMINI_API_KEY;
  if (gemini) out = out.split(gemini).join("[redacted]");
  out = out.replace(/api_key=[^&\s"']+/gi, "api_key=[redacted]");
  out = out.replace(/key=[A-Za-z0-9_-]{16,}/g, "key=[redacted]");
  return out;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return sanitize(err.message);
  return sanitize(String(err));
}

async function connect(): Promise<Client> {
  const url = toolboxUrl();
  const client = new Client({ name: "sg-trip-planner", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(url);

  client.onerror = (err) => {
    console.error(`[mcp] transport error: ${errorMessage(err)}`);
    resetMcpClient();
  };
  client.onclose = () => {
    resetMcpClient();
  };

  await client.connect(transport);
  const { tools } = await client.listTools();
  toolCache = tools;
  console.log(`[mcp] connected; discovered ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`);
  return client;
}

/** Cached, lazily connected client. */
export function getMcpClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((err: unknown) => {
      clientPromise = null;
      toolCache = null;
      throw new Error(`MCP connect failed: ${errorMessage(err)}`);
    });
  }
  return clientPromise;
}

/** Drop the cached client; the next getMcpClient() reconnects. */
export function resetMcpClient(): void {
  const stale = clientPromise;
  clientPromise = null;
  toolCache = null;
  if (stale) {
    stale.then((c) => c.close().catch(() => undefined)).catch(() => undefined);
  }
}

/** Discovered tools (connects if needed). */
export async function listTools(): Promise<Tool[]> {
  await getMcpClient();
  return toolCache ?? [];
}
