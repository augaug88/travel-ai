import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

let clientInstance: Client | null = null;
let clientPromise: Promise<Client> | null = null;
let cachedTools: Tool[] | null = null;
let hasLoggedTools = false;

function sanitizeUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    parsed.searchParams.forEach((_, key) => {
      if (
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('auth')
      ) {
        parsed.searchParams.set(key, 'REDACTED');
      }
    });
    return parsed.toString();
  } catch {
    return '[REDACTED_URL]';
  }
}

export function sanitizeError(err: unknown): string {
  if (!err) return 'Unknown error';
  const msg = err instanceof Error ? err.message : String(err);
  return msg
    .replace(/(api_key|apiKey|token|secret|key|access_token)=[^&\s]+/gi, '$1=REDACTED')
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer REDACTED')
    .replace(/https?:\/\/[^\s"'<>]+/g, (match) => sanitizeUrl(match));
}

async function createAndConnectClient(): Promise<Client> {
  const mcpUrl = process.env.SMITHERY_MCP_URL;
  if (!mcpUrl || !mcpUrl.trim()) {
    throw new Error('SMITHERY_MCP_URL environment variable is not configured');
  }

  const client = new Client(
    { name: 'sg-trip-planner', version: '1.0.0' },
    { capabilities: {} }
  );

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

  transport.onerror = (err) => {
    // Reconnect once on transport error by invalidating cached instance
    console.error('MCP transport error occurred, invalidating cached client');
    clientInstance = null;
    clientPromise = null;
  };

  await client.connect(transport);

  try {
    const toolsResult = await client.listTools();
    cachedTools = toolsResult.tools || [];
    if (!hasLoggedTools) {
      // Log ONLY tool NAMES (never arguments, never results)
      const toolNames = cachedTools.map((t) => t.name);
      console.log('Discovered tools:', toolNames.join(', '));
      hasLoggedTools = true;
    }
  } catch (err) {
    console.error('Error discovering tools on connect:', sanitizeError(err));
  }

  return client;
}

export async function getMcpClient(forceReconnect = false): Promise<Client> {
  if (forceReconnect || !clientInstance) {
    if (!clientPromise || forceReconnect) {
      clientPromise = createAndConnectClient()
        .then((client) => {
          clientInstance = client;
          return client;
        })
        .catch((err) => {
          clientInstance = null;
          clientPromise = null;
          throw new Error(`MCP connection failed: ${sanitizeError(err)}`);
        });
    }
    return clientPromise;
  }
  return clientInstance;
}

export async function getDiscoveredTools(): Promise<Tool[]> {
  const client = await getMcpClient();
  if (cachedTools && cachedTools.length > 0) {
    return cachedTools;
  }
  try {
    const result = await client.listTools();
    cachedTools = result.tools || [];
    if (!hasLoggedTools) {
      console.log('Discovered tools:', cachedTools.map((t) => t.name).join(', '));
      hasLoggedTools = true;
    }
    return cachedTools;
  } catch (err) {
    throw new Error(`Failed to list tools: ${sanitizeError(err)}`);
  }
}
