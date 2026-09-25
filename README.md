# SG Trip Planner

Mobile-first travel planner for a Singapore-based traveller. All live data comes
from a Smithery MCP toolbox; this app is an MCP **client**. Gemini orchestrates the
same tools in the Chat tab.

- `lib/` – MCP client, tool resolution, one module per feature (server-only)
- `api/` – thin Vercel handlers (one file per route)
- `server.ts` – preview server that mounts the same handlers + Vite
- `src/` – React UI (never sees a key or the toolbox URL)

## Setup

```sh
cp .env.example .env   # fill GEMINI_API_KEY and SMITHERY_MCP_URL
npm install
npm run dev            # http://localhost:3000
```

## MCP endpoint

`POST /api/mcp` publishes the data routes as an MCP server (Streamable HTTP,
JSON responses, no sessions) for agents using Gemini's `mcpToTool`. Tools are
prefixed `sgtrip_`: search_flights, search_hotels, changi_leave_by,
convert_currency, sg_weather, destination_weather, attractions, destination_info.
Any other method returns 405 with a JSON-RPC error body.

```sh
curl -s http://localhost:3000/api/mcp -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Deploy on Vercel

Import the GitHub repo in Vercel (framework preset: Vite). Set two environment
variables in the project settings: `GEMINI_API_KEY`, `SMITHERY_MCP_URL` and
`SMITHERY_API_KEY` (the key is sent as a Bearer header; the URL may also carry it
as `?api_key=`).
`vercel.json` raises the API function timeout to 60 s for MCP and Gemini calls
and rewrites non-API paths to the SPA.

Read-only by design: nothing books, pays, sends or deletes. Toolbox management
tools (`execute`, `remove_server`) and any write-style tool are blocked at the
MCP client and are never shown to Gemini.
