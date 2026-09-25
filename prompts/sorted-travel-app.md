# Prompt: Sorted Travel planner app (RGOGC)

Fill in the two values below, then paste everything under the line as your prompt.

- TEAM PREFIX: `voyager` (lowercase letters, digits, underscores only)
- VERCEL PROJECT: `voyager3` (so the MCP address is `https://voyager3.vercel.app/api/mcp`)

---

ROLE: You are a senior full-stack developer working in this existing Vite + React + Express project. `server.ts` is what the AI Studio preview runs. The `api/` folder at the project root is what Vercel runs. `lib/mcp.ts` and `lib/tools.ts` already hold an MCP client pattern: reuse its style (one cached client, reconnect once on error, `sanitizeError` on every message).

GOAL: Add a clean, simple travel-planning feature powered only by the Sorted Travel MCP server (`https://sorted.travel/mcp`, Streamable HTTP, no key needed for destination tools). A traveller can:
 1. pick a departure airport and month and see where to go,
 2. open one destination and see its facts, weather and visa hassle for their passport.
Then publish the same data as this app's own MCP server at `/api/mcp`, so other teams' agents can call it.

OUTPUT:

 0) Discover before you code. Write `scripts/discover-sorted.mjs`. It connects with `@modelcontextprotocol/sdk` `Client` + `StreamableHTTPClientTransport` to `process.env.SORTED_TRAVEL_MCP_URL || "https://sorted.travel/mcp"`, calls `listTools()`, and writes every tool's `name`, `description` and `inputSchema` to `docs/sorted-tools.json`. Run it and read the file. Use the exact parameter names, types and enums from that file everywhere below. Never guess a parameter name. If a tool listed below is missing, stop and tell me instead of inventing it.

 1) Dependencies: keep `@modelcontextprotocol/sdk` at exactly `1.30.1` and use the `zod` already installed. Do not add `@modelcontextprotocol/server`, `@modelcontextprotocol/client`, `mcp-handler` or the `sorted-travel` npm package. The SDK package only wraps REST; ranking, weather and visa are MCP-only.

 2) Upstream client in `lib/sorted.ts`: a second MCP client, separate from the Smithery one in `lib/mcp.ts`, pointed at `SORTED_TRAVEL_MCP_URL` (default `https://sorted.travel/mcp`). It sends `Authorization: Bearer ${SORTED_TRAVEL_API_KEY}` only when that variable is set. Export one function per upstream tool; each returns the parsed JSON:
    - `resolveDestination(query)` → `resolve_destination`: turns a city, country, region or airport name into a Sorted `handle` (e.g. `lisbon`) or `airport_code` (e.g. `LHR`).
    - `getRecommendedDestinations(filters)` → `get_recommended_destinations`: ranked destinations from a departure airport. Pass only the filters the user set (month, airport, budget, weather, visa, tags). Never turn on direct-flights-only unless the user asked.
    - `getDestinationInfo(handle)` → `get_destination_info`: brief, safety, currency, phone code, eSIM, taxi apps.
    - `getDestinationWeather(handle)` → `get_destination_weather`: current weather, 7-day forecast, monthly climate, best months.
    - `checkVisaRequirements(passport, destination)` → `check_visa_requirements`: visa stance from Sorted's visa table.
    Do not wrap `get_profile_preferences` or `update_profile_preferences`: they need OAuth, and one of them writes.
    If upstream returns HTTP 429, throw an error that says so. Do not retry in a loop.

 3) REST routes. Each is a thin file in `api/sorted/` that calls `lib/sorted.ts`, and each is also mounted in `server.ts` with `app.get(...)`, imported (never copied), the same way the existing routes are:
    - `GET /api/sorted/resolve?q=`
    - `GET /api/sorted/recommend?from=&month=&budget=&tags=`
    - `GET /api/sorted/destination?handle=`: calls info and weather in parallel and returns both.
    - `GET /api/sorted/visa?passport=&destination=`
    Every response includes `source: "sorted.travel"` and `fetched_at` (ISO time). On failure, use the existing `handleRouteError` in `api/_utils.ts` (status 502).

 4) Screens (React, Tailwind, lucide icons, same look as the existing views). Add a nav item "Sorted" in `Navbar.tsx` and routes in `App.tsx`:
    - `src/views/SortedDiscoverView.tsx`: an airport input (resolved through `/api/sorted/resolve`), a month select, optional budget and tags, and a "Find places" button. It shows up to 20 ranked cards with name, country, a short reason or score, and a link to the detail view.
    - `src/views/SortedPlaceView.tsx` at `/sorted/:handle`: a header with name and country; cards for Brief, Safety, Money & phone (currency, phone code, eSIM, taxi apps), Weather (now, 7-day, best months, with the line "Forecast by Foreca"), and Visa (a passport select that calls `/api/sorted/visa`, plus the line "Check with an official government source before you fly."). It ends with a link to `place_url` (or `https://sorted.travel/places/{handle}`).
    Use the existing `LoadingSkeleton`, `ErrorAlert` and `EmptyState` components. Show only data that came back. No sample, seed or fallback data, ever.

 5) Our own MCP server at `/api/mcp`:
    - Create `api/mcp.js` at the project root's `api/` folder, never inside `src/`. It exports `default async function handler(req, res)`.
      On POST: create `new McpServer({ name: "[TEAM PREFIX]-server", version: "1.0.0" })` and register the tools below. Create `new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })`, then `await server.connect(transport)`, then `await transport.handleRequest(req, res, req.body)`. On `res` close, close the transport and the server. Build both fresh on every request; keep no sessions.
      On any other method: return 405 with `{"jsonrpc":"2.0","error":{"code":-32000,"message":"Method not allowed"},"id":null}`.
    - In `server.ts`, after `express.json()`, add `app.post("/api/mcp", handler)` and `app.get("/api/mcp", handler)`, importing from `./api/mcp.js`.
    - Register these tools with `server.registerTool`. Each one calls the `lib/sorted.ts` function directly, never by fetching this app's own URL:
      - `[prefix]_resolve_destination(query)`: wraps `GET /api/sorted/resolve?q=` and returns matching handles and airport codes.
      - `[prefix]_recommend_destinations(from, month?, budget?, tags?)`: wraps `GET /api/sorted/recommend` and returns ranked destinations.
      - `[prefix]_destination_details(handle)`: wraps `GET /api/sorted/destination?handle=` and returns facts plus weather.
      - `[prefix]_visa_check(passport, destination)`: wraps `GET /api/sorted/visa` and returns the visa stance.
    - Every tool name starts with `[TEAM PREFIX]_` and uses only lowercase letters, digits and underscores.
    - Every description is 2 to 4 sentences covering four things: what comes back, that it is read from sorted.travel, when an agent should use it, and one thing it does not cover (it does not book travel; visa is not official advice).
    - Every input is a zod type with `.describe()` stating exactly what it accepts, matching the schemas in `docs/sorted-tools.json`.
    - Every tool has `annotations: { readOnlyHint: true, openWorldHint: true }`.
    - On success, return `{ content: [{ type: "text", text: JSON.stringify(result) }] }`, where `result` holds at most 20 items, `source: "sorted.travel"` and `fetched_at`.
    - On upstream failure, return `{ isError: true, content: [{ type: "text", text: "<one sentence naming what failed and the upstream status>" }] }`.

 6) Shared code lives in `lib/` or in `api/` files whose names start with `_`. Vercel turns every other file in `api/` into a public address.

GUARDRAILS: Read-only only: nothing that writes, sends, deletes, spends or books. Never put a key, token or password, or any part of one, in a tool result, description, log or the browser bundle; keys stay in `process.env` on the server. No database and no login. Do not touch the existing routes, screens or the Smithery client. Log tool names only, never arguments or results. Do not invent destination handles.

CONTEXT: Deployed on Vercel from GitHub (`augaug88/voyager3`). Environment variables: `GEMINI_API_KEY`, `SMITHERY_MCP_URL` (existing), `SORTED_TRAVEL_MCP_URL` (new, optional, default `https://sorted.travel/mcp`), `SORTED_TRAVEL_API_KEY` (new, optional, empty for destination tools). Add the two new ones to `.env.example`. Sorted Travel sends `RateLimit` headers and returns 429 when you call too fast. Other teams' agents will call `https://[VERCEL PROJECT].vercel.app/api/mcp` through the Gemini SDK's `mcpToTool` (MCP protocol 2025-11-25 over Streamable HTTP).

DONE WHEN: `npm run lint` passes; `docs/sorted-tools.json` exists; `/sorted` shows real ranked places for LHR in any month; a place page shows real info, weather and visa; and `tools/list` on `/api/mcp` returns the 4 prefixed tools.
