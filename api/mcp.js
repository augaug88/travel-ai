import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import {
  resolveDestination,
  getRecommendedDestinations,
  getDestinationDetails,
  checkVisaRequirements,
  SortedError,
} from '../lib/sorted.js';
import { findCountry } from '../lib/countries.js';

const PREFIX = 'voyager';
const annotations = { readOnlyHint: true, openWorldHint: true };

function ok(result) {
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
}

function fail(what, err) {
  const status = err instanceof SortedError && err.status ? `HTTP ${err.status}` : 'no status returned';
  return {
    isError: true,
    content: [{ type: 'text', text: `Sorted Travel ${what} failed (upstream status: ${status}).` }],
  };
}

function registerTools(server) {
  server.registerTool(
    `${PREFIX}_resolve_destination`,
    {
      title: 'Resolve a destination name',
      description:
        'Returns up to 20 Sorted Travel catalog matches (handle, name, country, airport code) for a city, country, region or airport name, read live from sorted.travel. ' +
        'Use it first whenever you only have a place name, then pass the handle to the other tools. ' +
        'It does not return facts, weather or prices.',
      inputSchema: {
        query: z.string().trim().min(1).max(100).describe('A city, country, region or airport name, e.g. "Lisbon", "Japan" or "Heathrow".'),
      },
      annotations,
    },
    async ({ query }) => {
      try {
        return ok(await resolveDestination(query));
      } catch (err) {
        return fail('resolve_destination', err);
      }
    }
  );

  server.registerTool(
    `${PREFIX}_recommend_destinations`,
    {
      title: 'Recommend destinations',
      description:
        'Returns up to 20 destinations ranked by Sorted Travel for a departure airport, using weather, visa hassle, safety and budget, read live from sorted.travel. ' +
        'Use it when a traveller asks where to go; set only the filters they asked for. ' +
        'It does not search or book flights or hotels.',
      inputSchema: {
        from: z.string().trim().regex(/^[A-Za-z]{3}$/).describe('Departure airport as a 3-letter IATA code, e.g. "SIN" or "LHR".'),
        month: z.number().int().min(1).max(12).optional().describe('Travel month as a number from 1 (January) to 12 (December).'),
        budget: z.string().trim().max(40).optional().describe('Budget level passed through to Sorted Travel, e.g. "low", "medium" or "high".'),
        tags: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe('Trip interests such as "beach", "hiking", "food" or "wildlife".'),
      },
      annotations,
    },
    async ({ from, month, budget, tags }) => {
      try {
        return ok(await getRecommendedDestinations({ from, month, budget, tags }));
      } catch (err) {
        return fail('get_recommended_destinations', err);
      }
    }
  );

  server.registerTool(
    `${PREFIX}_destination_details`,
    {
      title: 'Destination facts and weather',
      description:
        'Returns on-the-ground facts (brief, safety, currency, phone code, eSIM, taxi apps) plus current weather, 7-day forecast (Foreca), monthly climate and best months for one Sorted Travel destination, read live from sorted.travel. ' +
        'Use it after you have a handle from the resolve tool. ' +
        'It does not cover visa rules; use the visa tool for that.',
      inputSchema: {
        handle: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).max(80).describe('A Sorted Travel destination handle from the resolve tool, e.g. "lisbon".'),
      },
      annotations,
    },
    async ({ handle }) => {
      try {
        return ok(await getDestinationDetails(handle));
      } catch (err) {
        return fail('get_destination_info / get_destination_weather', err);
      }
    }
  );

  server.registerTool(
    `${PREFIX}_visa_check`,
    {
      title: 'Visa hassle check',
      description:
        "Returns the visa stance for a passport going to a destination from Sorted Travel's visa table, read live from sorted.travel. " +
        'Use it when a traveller asks whether they need a visa. ' +
        'It is not official immigration advice; tell the traveller to check a government source before they fly.',
      inputSchema: {
        passport: z.string().trim().min(2).max(60).describe('Passport country as an ISO 3166-1 alpha-2 code or English name, e.g. "SG" or "Singapore".'),
        destination: z.string().trim().min(1).max(80).describe('Destination country name or Sorted Travel handle, e.g. "Japan" or "tokyo".'),
      },
      annotations,
    },
    async ({ passport, destination }) => {
      const country = findCountry(passport);
      if (!country) {
        return { isError: true, content: [{ type: 'text', text: `Passport country "${passport}" is not recognised.` }] };
      }
      try {
        return ok(await checkVisaRequirements(country, destination));
      } catch (err) {
        return fail('check_visa_requirements', err);
      }
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null });
    return;
  }

  // Fresh server and transport per request: this endpoint keeps no sessions.
  const server = new McpServer({ name: `${PREFIX}-server`, version: '1.0.0' });
  registerTools(server);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });

  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request failed:', err instanceof Error ? err.name : 'unknown error');
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  }
}
