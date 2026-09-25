import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { listTools } from "./mcp.js";

/**
 * Capability → tool resolution. Tool names are discovered at runtime via
 * listTools(); nothing here invents a name. Each capability lists candidates
 * in priority order (primary server first, backups last). The first tool that
 * matches the earliest candidate wins.
 */

export interface Candidate {
  /** Smithery server name reported as `source` in responses. */
  source: string;
  /** Predicate over lower-cased tool name and description. */
  test: (name: string, description: string) => boolean;
}

export interface Capability {
  key: string;
  label: string;
  candidates: Candidate[];
}

export interface ResolvedTool {
  name: string;
  source: string;
  inputSchema: Record<string, unknown>;
}

export class MissingCapabilityError extends Error {
  constructor(
    public readonly capability: string,
    label: string,
  ) {
    super(`The toolbox has no tool for ${label} (capability "${capability}")`);
    this.name = "MissingCapabilityError";
  }
}

const has = (s: string, ...needles: string[]) => needles.some((n) => s.includes(n));
/** Toolbox tools are named "<owner>-<server>_<tool>"; match on the tool part. */
const tail = (n: string) => n.split("_").slice(1).join("_") || n;
const endsWith = (n: string, ...tools: string[]) => tools.some((t) => n === t || n.endsWith(`_${t}`) || tail(n) === t);

export const CAP = {
  flights: {
    key: "flights",
    label: "flight search",
    candidates: [
      { source: "kiwi", test: (n) => has(n, "search-flight", "search_flight", "searchflight") },
      { source: "kiwi", test: (n, d) => n.includes("flight") && (has(n, "search", "find") || d.includes("kiwi")) },
      { source: "mrabi/google-flights", test: (n) => n.includes("flight") },
    ],
  },
  hotels: {
    key: "hotels",
    label: "hotel search",
    candidates: [
      { source: "moodtrip/moodtrip-hotel-search", test: (n) => n.includes("moodtrip") && endsWith(n, "searchhotelswithrates") },
      { source: "google/hotels", test: (n, d) => n.includes("hotel") && (n.includes("google") || d.includes("google")) },
      { source: "google/hotels", test: (n, d) => n.includes("hotel") && has(n, "search", "find") && !d.includes("moodtrip") },
      { source: "moodtrip/moodtrip-hotel-search", test: (n) => n.includes("moodtrip") && endsWith(n, "findhotels") },
      { source: "moodtrip/moodtrip-hotel-search", test: (n) => n.includes("hotel") },
    ],
  },
  trafficIncidents: {
    key: "traffic_incidents",
    label: "LTA DataMall traffic incidents",
    candidates: [
      { source: "hithereiamaliff/mcp-ltadatamallsg", test: (n) => n.includes("traffic") && n.includes("incident") },
      { source: "hithereiamaliff/mcp-ltadatamallsg", test: (n, d) => n.includes("incident") || (n.includes("traffic") && d.includes("incident")) },
    ],
  },
  travelTimes: {
    key: "travel_times",
    label: "LTA DataMall expressway travel times",
    candidates: [
      { source: "hithereiamaliff/mcp-ltadatamallsg", test: (n) => n.includes("travel") && n.includes("time") },
      { source: "hithereiamaliff/mcp-ltadatamallsg", test: (n, d) => n.includes("traffic") && n.includes("speed") && d.includes("expressway") },
    ],
  },
  fx: {
    key: "fx",
    label: "currency exchange rates",
    candidates: [
      { source: "stockvibes07/exchange-mcp", test: (n) => n.includes("exchange-mcp") && endsWith(n, "convert") },
      { source: "stockvibes07/exchange-mcp", test: (n) => n.includes("exchange-mcp") && endsWith(n, "get_rate") },
      { source: "stockvibes07/exchange-mcp", test: (n) => has(n, "exchange", "convert", "currency") && !has(n, "xrocket", "crypto") },
      { source: "stockvibes07/exchange-mcp", test: (n, d) => n.includes("rate") && d.includes("currenc") },
    ],
  },
  sgWeather2h: {
    key: "sg_weather_2h",
    label: "NEA 2-hour forecast",
    candidates: [
      { source: "vdineshk/sg-weather-data-mcp", test: (n) => endsWith(n, "get_sg_weather_now") },
      { source: "vdineshk/sg-weather-data-mcp", test: (n) => has(n, "2h", "2-h", "2_h", "2hour", "two_hour", "twohour", "two-hour") },
      { source: "vdineshk/sg-weather-data-mcp", test: (n, d) => has(n, "forecast", "weather") && has(d, "2-hour", "2 hour", "two-hour", "nowcast") },
    ],
  },
  sgWeather24h: {
    key: "sg_weather_24h",
    label: "NEA 24-hour forecast",
    candidates: [
      { source: "vdineshk/sg-weather-data-mcp", test: (n) => endsWith(n, "get_sg_forecast") },
      { source: "vdineshk/sg-weather-data-mcp", test: (n) => has(n, "24h", "24-h", "24_h", "24hour", "24-hour") },
      { source: "vdineshk/sg-weather-data-mcp", test: (n, d) => has(n, "forecast", "weather") && has(d, "24-hour", "24 hour") },
    ],
  },
  sgRain: {
    key: "sg_rain",
    label: "NEA rainfall",
    candidates: [
      { source: "vdineshk/sg-weather-data-mcp", test: (n) => has(n, "sg", "singapore", "nea") && has(n, "rain", "precip") },
    ],
  },
  sgWeatherAny: {
    key: "sg_weather",
    label: "Singapore (NEA) weather",
    candidates: [
      { source: "vdineshk/sg-weather-data-mcp", test: (n, d) => has(n, "weather", "forecast") && has(n + " " + d, "singapore", "nea", "sg ") },
    ],
  },
  resolveDestination: {
    key: "resolve_destination",
    label: "destination lookup (Sorted)",
    candidates: [{ source: "sorted/travel-destinations", test: (n) => endsWith(n, "resolve_destination") }],
  },
  destinationInfo: {
    key: "destination_info",
    label: "destination facts (Sorted)",
    candidates: [{ source: "sorted/travel-destinations", test: (n) => endsWith(n, "get_destination_info") }],
  },
  abroadWeather: {
    key: "weather_abroad",
    label: "weather for a city abroad",
    candidates: [
      { source: "sorted/travel-destinations", test: (n) => endsWith(n, "get_destination_weather") },
      { source: "isdaniel/mcp_weather_server", test: (n, d) => n.includes("weather") && !has(n + " " + d, "singapore", "nea", "2-hour", "24-hour", "rainfall", "sg_", "asean") },
      { source: "isdaniel/mcp_weather_server", test: (n, d) => has(n, "forecast", "temperature") && has(d, "city") && !has(d, "singapore") },
    ],
  },
  attractions: {
    key: "attractions",
    label: "attractions / things to do",
    candidates: [
      { source: "tripadvisor/search", test: (n, d) => has(n + " " + d, "tripadvisor") && has(n, "search") },
      { source: "tripadvisor/search", test: (n, d) => has(n, "attraction", "things_to_do", "things-to-do") || (n.includes("search") && has(d, "attraction", "things to do")) },
      { source: "hithereiamaliff/mcp-grabmaps", test: (n, d) => has(n + " " + d, "grab") && has(n, "search", "place") },
      { source: "cyanheads/openstreetmap-mcp-server", test: (n, d) => has(n + " " + d, "openstreetmap", "osm", "nominatim") && has(n, "search", "geocode", "place") },
    ],
  },
} satisfies Record<string, Capability>;

export async function resolveTool(cap: Capability): Promise<ResolvedTool> {
  const tools = await listTools();
  for (const candidate of cap.candidates) {
    const match = tools.find((t) => candidate.test(t.name.toLowerCase(), (t.description ?? "").toLowerCase()));
    if (match) return toResolved(match, candidate.source);
  }
  throw new MissingCapabilityError(cap.key, cap.label);
}

/** Like resolveTool but returns null instead of throwing. */
export async function tryResolveTool(cap: Capability): Promise<ResolvedTool | null> {
  try {
    return await resolveTool(cap);
  } catch (err) {
    if (err instanceof MissingCapabilityError) return null;
    throw err;
  }
}

function toResolved(tool: Tool, source: string): ResolvedTool {
  return { name: tool.name, source, inputSchema: (tool.inputSchema ?? {}) as Record<string, unknown> };
}
