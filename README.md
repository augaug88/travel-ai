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

## Deploy on Vercel

Import the GitHub repo in Vercel (framework preset: Vite). Set two environment
variables in the project settings: `GEMINI_API_KEY` and `SMITHERY_MCP_URL`.
`vercel.json` raises the API function timeout to 60 s for MCP and Gemini calls
and rewrites non-API paths to the SPA.

Read-only by design: nothing books, pays, sends or deletes. Toolbox management
tools (`execute`, `remove_server`) and any write-style tool are blocked at the
MCP client and are never shown to Gemini.
