import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildMcpServer } from "../lib/mcpServer.js";

/**
 * MCP endpoint (Streamable HTTP, JSON responses, stateless).
 * Vercel runs this file at /api/mcp; server.ts mounts the same handler for
 * the preview. A fresh server and transport are built for every POST.
 */
/** Minimal shapes satisfied by Vercel's and Express's request/response objects. */
type Req = { method?: string; body?: unknown };
type Res = { statusCode: number; setHeader(name: string, value: string): unknown; end(body?: string): unknown; on(event: "close", cb: () => void): unknown };

const METHOD_NOT_ALLOWED = { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null };

export default async function handler(req: Req, res: Res): Promise<void> {
  if ((req.method ?? "GET").toUpperCase() !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(METHOD_NOT_ALLOWED));
    return;
  }

  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });
  await server.connect(transport);
  await transport.handleRequest(req as unknown as IncomingMessage, res as unknown as ServerResponse, req.body);
}
