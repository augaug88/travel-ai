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

Read-only by design: nothing books, pays, sends or deletes.
