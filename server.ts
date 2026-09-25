/**
 * Preview server (AI Studio / local). Mounts the exact same handler objects
 * that Vercel runs from api/, then serves the Vite app.
 * Run: npm run dev   (or NODE_ENV=production npm start after `vite build`)
 */
import express, { type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ApiHandler } from "./lib/http.js";

import attractions from "./api/attractions.js";
import changi from "./api/changi.js";
import chat from "./api/chat.js";
import destination from "./api/destination.js";
import flights from "./api/flights.js";
import fx from "./api/fx.js";
import hotels from "./api/hotels.js";
import weatherAbroad from "./api/weather/abroad.js";
import weatherSg from "./api/weather/sg.js";
import mcp from "./api/mcp.js";

const routes: Record<string, ApiHandler> = {
  "/api/flights": flights,
  "/api/hotels": hotels,
  "/api/changi": changi,
  "/api/fx": fx,
  "/api/weather/sg": weatherSg,
  "/api/weather/abroad": weatherAbroad,
  "/api/attractions": attractions,
  "/api/destination": destination,
  "/api/chat": chat,
};

async function main(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "256kb" }));

  // MCP server: same handler Vercel runs from api/mcp.ts.
  app.post("/api/mcp", (req: Request, res: Response) => {
    void mcp(req, res);
  });
  app.get("/api/mcp", (req: Request, res: Response) => {
    void mcp(req, res);
  });

  for (const [route, handler] of Object.entries(routes)) {
    app.all(route, (req: Request, res: Response) => {
      void handler(req, res);
    });
  }
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ error: "Unknown API route" });
  });

  const here = path.dirname(fileURLToPath(import.meta.url));
  if (process.env.NODE_ENV === "production") {
    const dist = path.join(here, "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({ root: here, server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT ?? 3000);
  app.listen(port, () => {
    console.log(`SG Trip Planner listening on http://localhost:${port}`);
    console.log(`env: GEMINI_API_KEY ${process.env.GEMINI_API_KEY ? "set" : "MISSING"}, SMITHERY_MCP_URL ${process.env.SMITHERY_MCP_URL ? "set" : "MISSING"}, SMITHERY_API_KEY ${process.env.SMITHERY_API_KEY ? "set" : "not set (using api_key from URL)"}`);
  });
}

main().catch((err: unknown) => {
  console.error("server failed to start:", err instanceof Error ? err.message : err);
  process.exit(1);
});
