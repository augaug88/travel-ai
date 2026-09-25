import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getMcpClient, getDiscoveredTools, sanitizeError } from './mcp.js';

export interface MatchedTool {
  name: string;
  source: string;
  tool: Tool;
}

export type CapabilityKey =
  | 'flights'
  | 'hotels'
  | 'changi'
  | 'weather_sg'
  | 'weather_abroad'
  | 'fx'
  | 'attractions';

async function executeCall(client: any, name: string, args: Record<string, unknown>): Promise<any> {
  const response = await client.callTool({ name, arguments: args });
  if (response?.isError) {
    const errorText = Array.isArray(response.content)
      ? response.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n')
      : 'Tool returned error status';
    throw new Error(errorText || 'Tool execution failed');
  }

  if (Array.isArray(response?.content)) {
    const textParts = response.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n')
      .trim();

    if (textParts) {
      try {
        return JSON.parse(textParts);
      } catch {
        return { text: textParts };
      }
    }
  }

  return response;
}

export async function callTool(name: string, args: Record<string, unknown> = {}): Promise<any> {
  let client = await getMcpClient();
  try {
    return await executeCall(client, name, args);
  } catch (err: any) {
    // Reconnect once on transport / connection error
    try {
      client = await getMcpClient(true);
      return await executeCall(client, name, args);
    } catch (retryErr: any) {
      const msg = sanitizeError(retryErr?.message || retryErr || err?.message || err);
      throw new Error(`${name} failed: ${msg}`);
    }
  }
}

/**
 * Discover exact tool names at runtime from listTools() based on hints.
 * Backups are used only if primary tool for that job is missing.
 * If no tool matches, throws an error naming the missing capability. Never invent a tool name.
 */
export async function resolveTool(capability: CapabilityKey): Promise<MatchedTool> {
  const tools = await getDiscoveredTools();

  switch (capability) {
    case 'flights': {
      // Primary: kiwi -> tool "search-flight"
      const kiwiMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('search-flight') || n.includes('search_flight') || (n.includes('kiwi') && n.includes('flight'));
      });
      if (kiwiMatch) {
        return { name: kiwiMatch.name, source: 'kiwi', tool: kiwiMatch };
      }

      // Backup: mrabi/google-flights
      const backupFlight = tools.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('google-flights') || n.includes('google_flight') || n.includes('mrabi') || (n.includes('flight') && !n.includes('track'));
      });
      if (backupFlight) {
        return { name: backupFlight.name, source: 'mrabi/google-flights', tool: backupFlight };
      }

      throw new Error('Missing capability: kiwi flight search (search-flight)');
    }

    case 'hotels': {
      // Primary: google/hotels
      const googleHotelsMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          (n.includes('google') && n.includes('hotel')) ||
          n.includes('google/hotels') ||
          n === 'hotels' ||
          n === 'hotel-search' ||
          (n.includes('hotel') && !n.includes('moodtrip'))
        );
      });
      if (googleHotelsMatch) {
        return { name: googleHotelsMatch.name, source: 'google/hotels', tool: googleHotelsMatch };
      }

      // Backup: moodtrip/moodtrip-hotel-search
      const moodtripMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('moodtrip') || n.includes('hotel');
      });
      if (moodtripMatch) {
        return { name: moodtripMatch.name, source: 'moodtrip/moodtrip-hotel-search', tool: moodtripMatch };
      }

      throw new Error('Missing capability: google/hotels hotel search');
    }

    case 'changi': {
      // Primary: hithereiamaliff/mcp-ltadatamallsg (LTA traffic incidents)
      const ltaMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          n.includes('ltadatamallsg') ||
          n.includes('lta') ||
          (n.includes('traffic') && n.includes('incident')) ||
          n.includes('hithereiamaliff/mcp-ltadatamallsg')
        );
      });
      if (ltaMatch) {
        return { name: ltaMatch.name, source: 'hithereiamaliff/mcp-ltadatamallsg', tool: ltaMatch };
      }

      // Backup: hithereiamaliff/mcp-grabmaps
      const grabmapsMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('grabmaps') || n.includes('grab');
      });
      if (grabmapsMatch) {
        return { name: grabmapsMatch.name, source: 'hithereiamaliff/mcp-grabmaps', tool: grabmapsMatch };
      }

      throw new Error('Missing capability: hithereiamaliff/mcp-ltadatamallsg (LTA DataMall traffic incidents)');
    }

    case 'weather_sg': {
      // Primary: vdineshk/sg-weather-data-mcp
      const sgWeatherMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          n.includes('vdineshk') ||
          n.includes('sg-weather') ||
          n.includes('sg_weather') ||
          (n.includes('weather') && (n.includes('sg') || n.includes('nea') || n.includes('singapore')))
        );
      });
      if (sgWeatherMatch) {
        return { name: sgWeatherMatch.name, source: 'vdineshk/sg-weather-data-mcp', tool: sgWeatherMatch };
      }

      throw new Error('Missing capability: vdineshk/sg-weather-data-mcp (NEA Singapore weather)');
    }

    case 'weather_abroad': {
      // Primary: isdaniel/mcp_weather_server
      const abroadMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          n.includes('isdaniel') ||
          n.includes('mcp_weather') ||
          (n.includes('weather') && !n.includes('sg') && !n.includes('nea') && !n.includes('singapore'))
        );
      });
      if (abroadMatch) {
        return { name: abroadMatch.name, source: 'isdaniel/mcp_weather_server', tool: abroadMatch };
      }

      throw new Error('Missing capability: isdaniel/mcp_weather_server (weather for city abroad)');
    }

    case 'fx': {
      // Primary: stockvibes07/exchange-mcp
      const fxMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          n.includes('stockvibes07') ||
          n.includes('exchange-mcp') ||
          n.includes('exchange_rate') ||
          n.includes('exchange') ||
          n.includes('currency') ||
          n.includes('fx')
        );
      });
      if (fxMatch) {
        return { name: fxMatch.name, source: 'stockvibes07/exchange-mcp', tool: fxMatch };
      }

      throw new Error('Missing capability: stockvibes07/exchange-mcp (currency exchange rates)');
    }

    case 'attractions': {
      // Primary: tripadvisor/search
      const tripadvisorMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return (
          n.includes('tripadvisor') ||
          (n.includes('attraction') && !n.includes('openstreet')) ||
          n.includes('things_to_do') ||
          n.includes('poi')
        );
      });
      if (tripadvisorMatch) {
        return { name: tripadvisorMatch.name, source: 'tripadvisor/search', tool: tripadvisorMatch };
      }

      // Backup: cyanheads/openstreetmap-mcp-server
      const osmMatch = tools.find((t) => {
        const n = t.name.toLowerCase();
        return n.includes('openstreetmap') || n.includes('cyanheads') || n.includes('osm');
      });
      if (osmMatch) {
        return { name: osmMatch.name, source: 'cyanheads/openstreetmap-mcp-server', tool: osmMatch };
      }

      throw new Error('Missing capability: tripadvisor/search (attractions and things to do)');
    }
  }
}
