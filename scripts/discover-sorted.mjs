// Lists every tool on the Sorted Travel MCP server and writes docs/sorted-tools.json.
// Run: node scripts/discover-sorted.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = process.env.SORTED_TRAVEL_MCP_URL || 'https://sorted.travel/mcp';
const headers = process.env.SORTED_TRAVEL_API_KEY
  ? { Authorization: `Bearer ${process.env.SORTED_TRAVEL_API_KEY}` }
  : {};

const client = new Client({ name: 'sorted-discovery', version: '1.0.0' }, { capabilities: {} });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));
const { tools } = await client.listTools();
const out = tools.map(({ name, description, inputSchema, outputSchema, annotations }) => ({
  name,
  description,
  inputSchema,
  outputSchema,
  annotations,
}));

await mkdir('docs', { recursive: true });
await writeFile('docs/sorted-tools.json', JSON.stringify({ url, fetched_at: new Date().toISOString(), tools: out }, null, 2));
console.log(`Wrote ${out.length} tools to docs/sorted-tools.json: ${out.map((t) => t.name).join(', ')}`);
await client.close();
