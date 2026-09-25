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

/**
 * Smithery expects the key as an Authorization header. Take it from
 * SMITHERY_API_KEY, or fall back to the api_key query parameter in the URL.
 */
function toolboxApiKey(url: URL): string | undefined {
  const fromEnv = process.env.SMITHERY_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const fromUrl = url.searchParams.get("api_key")?.trim();
  return fromUrl || undefined;
}

/** Remove anything that could identify a key or the toolbox URL from a message. */
export function sanitize(message: string): string {
  let out = message;
  const apiKey = process.env.SMITHERY_API_KEY;
  if (apiKey) out = out.split(apiKey).join("[redacted]");
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
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]");
  return out;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return sanitize(err.message);
  return sanitize(String(err));
}

/**
 * Read-only guardrail. The toolbox exposes management tools (remove_server,
 * execute) and some servers expose write tools. None of them may ever be
 * listed to Gemini or called by a route.
 */
const DENIED_EXACT = new Set(["execute", "remove_server"]);
const DENIED_PATTERN = /(^|[._-])(remove|delete|update|create|book|pay|purchase|send|cancel|write|post)([._-]|$)/i;

/** Tool part of "<server>.<tool>" or "<server>_<tool>". */
function toolPart(name: string): string {
  const dot = name.indexOf(".");
  if (dot >= 0) return name.slice(dot + 1);
  const us = name.indexOf("_");
  return us >= 0 ? name.slice(us + 1) : name;
}

interface Annotated {
  name: string;
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
}

/**
 * Toolbox management tools are always denied. Otherwise a tool whose server
 * declares it read-only (readOnlyHint) is allowed; anything else with a
 * write-style verb in its name is denied.
 */
export function isDeniedTool(tool: string | Annotated): boolean {
  const name = typeof tool === "string" ? tool : tool.name;
  if (DENIED_EXACT.has(name) || DENIED_EXACT.has(toolPart(name))) return true;
  const ann = typeof tool === "string" ? undefined : tool.annotations;
  if (ann?.readOnlyHint === true && ann.destructiveHint !== true) return false;
  return DENIED_PATTERN.test(name);
}

/** Names denied by policy in the current tool list (filled on connect). */
let deniedNames = new Set<string>();

/** Wrap a Client so listTools() hides denied tools and callTool() refuses them. */
function readOnly(client: Client): Client {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "listTools") {
        return async (...args: Parameters<Client["listTools"]>) => {
          const res = await target.listTools(...args);
          deniedNames = new Set(res.tools.filter((t) => isDeniedTool(t)).map((t) => t.name));
          return { ...res, tools: res.tools.filter((t) => !deniedNames.has(t.name)) };
        };
      }
      if (prop === "callTool") {
        return (...args: Parameters<Client["callTool"]>) => {
          const name = args[0]?.name ?? "";
          if (deniedNames.has(name) || DENIED_EXACT.has(name) || DENIED_EXACT.has(toolPart(name))) {
            return Promise.reject(new Error(`tool "${name}" is blocked: this app is read-only`));
          }
          return target.callTool(...args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

async function connect(): Promise<Client> {
  const url = toolboxUrl();
  const raw = new Client({ name: "sg-trip-planner", version: "0.1.0" });
  const client = readOnly(raw);
  const apiKey = toolboxApiKey(url);
  if (!apiKey) throw new Error("no toolbox key: set SMITHERY_API_KEY or include api_key in SMITHERY_MCP_URL");
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });

  raw.onerror = (err) => {
    console.error(`[mcp] transport error: ${errorMessage(err)}`);
    resetMcpClient();
  };
  raw.onclose = () => {
    resetMcpClient();
  };

  await raw.connect(transport);
  const { tools: all } = await raw.listTools();
  deniedNames = new Set(all.filter((t) => isDeniedTool(t)).map((t) => t.name));
  const tools = all.filter((t) => !deniedNames.has(t.name));
  const blocked = Array.from(deniedNames);
  toolCache = tools;
  console.log(`[mcp] connected; discovered ${tools.length} usable tools: ${tools.map((t) => t.name).join(", ")}`);
  if (blocked.length) console.log(`[mcp] blocked (read-only guardrail): ${blocked.join(", ")}`);
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
