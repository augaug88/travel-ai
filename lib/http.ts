import { MissingCapabilityError } from "./capabilities.js";
import { BadRequestError, UpstreamError } from "./errors.js";
import { errorMessage } from "./mcp.js";

/**
 * Minimal request/response shapes satisfied by both Vercel's (req, res) and
 * Express's (req, res). The same handler object is exported from api/*.ts for
 * Vercel and mounted by server.ts for the preview — no code is copied.
 */
export interface ApiRequest {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
}
export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): unknown;
}
export type ApiHandler = (req: ApiRequest, res: ApiResponse) => Promise<void>;

export function query(req: ApiRequest, name: string): string | undefined {
  const v = req.query?.[name];
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export function requireQuery(req: ApiRequest, name: string): string {
  const v = query(req, name);
  if (!v) throw new BadRequestError(`Missing required query parameter "${name}"`);
  return v;
}

export function createHandler(method: "GET" | "POST", run: (req: ApiRequest) => Promise<unknown>): ApiHandler {
  return async (req, res) => {
    if ((req.method ?? "GET").toUpperCase() !== method) {
      res.status(405).json({ error: `Use ${method}` });
      return;
    }
    try {
      const data = await run(req);
      res.status(200).json(data);
    } catch (err) {
      if (err instanceof BadRequestError) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof MissingCapabilityError) {
        console.error(`[api] missing capability: ${err.capability}`);
        res.status(502).json({ error: err.message, source: "toolbox", missing_capability: err.capability });
        return;
      }
      const source = err instanceof UpstreamError ? err.source : "unknown";
      const message = errorMessage(err);
      console.error(`[api] upstream failure (${source}): ${message}`);
      res.status(502).json({ error: message, source });
    }
  };
}
