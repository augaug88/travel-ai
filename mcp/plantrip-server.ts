import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcp-server.js';

export { MCP_TOOLS_REGISTRY, MCP_TOOLS_METADATA } from './mcp-server.js';

// Run as a local stdio MCP server: npx tsx mcp/plantrip-server.ts
async function main() {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
  process.stderr.write('PlanTrip MCP server running on stdio transport.\n');
}

if (process.argv[1]?.includes('plantrip-server')) {
  main().catch((err) => {
    process.stderr.write(`PlanTrip MCP Server failed to start: ${err.message}\n`);
    process.exit(1);
  });
}
