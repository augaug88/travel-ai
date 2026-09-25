import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchAttractions } from "./attractions.js";
import { changiPlan } from "./changi.js";
import { destinationInfo } from "./destination.js";
import { convert } from "./fx.js";
import { searchFlights } from "./flights.js";
import { searchHotels } from "./hotels.js";
import { errorMessage } from "./mcp.js";
import { abroadWeather, sgWeather } from "./weather.js";

/**
 * Builds the MCP server that publishes this app's read-only data routes.
 * Every tool calls the same lib/ function its HTTP route uses. A fresh
 * server is built per request by api/mcp.ts; nothing is cached here.
 */
export const TEAM_PREFIX = "sgtrip";
export const SERVER_NAME = `${TEAM_PREFIX}-server`;
export const SERVER_VERSION = "1.0.0";

const ANNOTATIONS = { readOnlyHint: true, openWorldHint: true } as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const IATA = /^[A-Za-z]{3}$/;
const ISO4217 = /^[A-Za-z]{3}$/;

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Drop the verbose `raw` payloads so agents get the normalised fields only. */
function stripRaw(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => stripRaw(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === "raw") continue;
    out[k] = stripRaw(v, depth + 1);
  }
  return out;
}

function ok(result: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(stripRaw(result)) }] };
}

function failed(tool: string, err: unknown): ToolResult {
  return { isError: true, content: [{ type: "text", text: `${tool} failed: ${errorMessage(err)}` }] };
}

/** Run a lib function; never throw out of a tool handler. */
async function run(tool: string, fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    return failed(tool, err);
  }
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const name = (n: string) => `${TEAM_PREFIX}_${n}`;

  server.registerTool(
    name("search_flights"),
    {
      description:
        "Returns up to 20 flight options with airline, times, stops, price and currency, plus source and fetched_at. " +
        "Read live from the Ignav Flights search_flights tool in the Smithery toolbox, priced for the SG market. " +
        "Use it when an agent needs fares or schedules between two airports on given dates. " +
        "It does not book, hold or price seats for more than one adult.",
      inputSchema: {
        from: z.string().regex(IATA).optional().describe("Origin airport IATA code, 3 letters. Defaults to SIN."),
        to: z.string().regex(IATA).describe("Destination airport IATA code, 3 letters, e.g. NRT."),
        depart: z.string().regex(DATE).describe("Departure date as YYYY-MM-DD."),
        return: z.string().regex(DATE).optional().describe("Return date as YYYY-MM-DD for a round trip. Omit for one way."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("search_flights"), () => searchFlights({ from: a.from ?? "SIN", to: a.to, depart: a.depart, ret: a.return })),
  );

  server.registerTool(
    name("search_hotels"),
    {
      description:
        "Returns up to 20 hotels with name, rating, review count, per-night price, currency and booking link, plus source and fetched_at. " +
        "Read live from the moodtrip searchHotelsWithRates tool in the Smithery toolbox. " +
        "Use it for accommodation prices in a city for fixed dates, two adults in one room. " +
        "It does not book rooms or return availability for other occupancies.",
      inputSchema: {
        city: z.string().min(1).describe("City name, e.g. Tokyo."),
        country: z.string().regex(/^[A-Za-z]{2}$/).optional().describe("ISO 3166-1 alpha-2 country code, e.g. JP. Strongly recommended; the upstream needs it to disambiguate cities."),
        checkin: z.string().regex(DATE).describe("Check-in date as YYYY-MM-DD."),
        checkout: z.string().regex(DATE).describe("Check-out date as YYYY-MM-DD, after checkin."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("search_hotels"), () => searchHotels({ city: a.city, country: a.country, checkin: a.checkin, checkout: a.checkout })),
  );

  server.registerTool(
    name("changi_leave_by"),
    {
      description:
        "Returns a leave-by time for a flight from Changi Airport: departure minus 3 hours minus 15 minutes per live incident on ECP, PIE, TPE or KPE, with the matching incidents, plus source and fetched_at. " +
        "Read live from the LTA DataMall traffic_incidents tool in the Smithery toolbox. " +
        "Use it when a traveller in Singapore asks when to leave for the airport. " +
        "It does not estimate journey time from a specific address or cover public transport.",
      inputSchema: {
        flight_time: z.string().min(4).describe('Scheduled departure as "HH:mm" (today, Singapore time) or an ISO date-time such as 2026-11-10T23:45.'),
        from: z.string().optional().describe("Free-text starting area in Singapore, e.g. Jurong East. Informational only."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("changi_leave_by"), () => changiPlan({ flight_time: a.flight_time, from: a.from })),
  );

  server.registerTool(
    name("convert_currency"),
    {
      description:
        "Returns the converted amount and the rate between two currencies, plus source and fetched_at. " +
        "Read live from the fx-converter-mcp convert_currency tool in the Smithery toolbox, which uses ECB reference rates. " +
        "Use it to express a Singapore-dollar budget in a destination currency or the reverse. " +
        "It does not give historical rates or bank and card rates.",
      inputSchema: {
        from: z.string().regex(ISO4217).optional().describe("Source currency ISO 4217 code. Defaults to SGD."),
        to: z.string().regex(ISO4217).describe("Target currency ISO 4217 code, e.g. JPY."),
        amount: z.number().positive().optional().describe("Amount in the source currency. Defaults to 1."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("convert_currency"), () => convert({ from: a.from, to: a.to, amount: a.amount === undefined ? undefined : String(a.amount) })),
  );

  server.registerTool(
    name("sg_weather"),
    {
      description:
        "Returns Singapore's NEA 2-hour forecast by area and the 24-hour forecast, plus source and fetched_at. " +
        "Read live from the sg-weather-data-mcp get_sg_weather_now and get_sg_forecast tools in the Smithery toolbox. " +
        "Use it for weather in Singapore itself, for example at Changi before a flight. " +
        "It does not cover any place outside Singapore.",
      inputSchema: {
        area: z.string().optional().describe("Optional NEA area name to filter the 2-hour forecast, e.g. Changi, Orchard, Jurong."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("sg_weather"), () => sgWeather({ area: a.area })),
  );

  server.registerTool(
    name("destination_weather"),
    {
      description:
        "Returns a 7-day forecast, monthly climate averages and a best-time-to-visit summary for a destination abroad, plus source and fetched_at. " +
        "Read live from the Sorted Travel resolve_destination and get_destination_weather tools in the Smithery toolbox; forecast data is by Foreca. " +
        "Use it to plan what to pack or when to travel. " +
        "It does not cover Singapore and does not resolve small towns that Sorted has no page for.",
      inputSchema: {
        city: z.string().min(1).describe("City, country or IATA airport code, e.g. Tokyo, Japan or HND."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("destination_weather"), () => abroadWeather({ city: a.city })),
  );

  server.registerTool(
    name("attractions"),
    {
      description:
        "Returns up to 20 attractions or things to do with name, rating, review count, address and link, plus source and fetched_at. " +
        "Read live from the Tripadvisor Search tool in the Smithery toolbox. " +
        "Use it when an agent needs sights or activities for a destination. " +
        "It does not include opening hours or ticket prices.",
      inputSchema: {
        city: z.string().min(1).describe("City or destination name, e.g. Bangkok."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("attractions"), () => searchAttractions({ city: a.city })),
  );

  server.registerTool(
    name("destination_info"),
    {
      description:
        "Returns on-the-ground facts for a destination: safety level, currency, phone code, taxi apps and a dated brief with recent news, plus city events and local tips when available, plus source and fetched_at. " +
        "Read live from the Sorted Travel get_destination_info tool in the Smithery toolbox, with Pulse get_events and get_local_tips as optional extras. " +
        "Use it before recommending a destination or answering practical questions about it. " +
        "It does not give visa requirements for Singapore passports, which Sorted reports as Unknown.",
      inputSchema: {
        city: z.string().min(1).describe("City, country or IATA airport code, e.g. Tokyo."),
      },
      annotations: ANNOTATIONS,
    },
    (a) => run(name("destination_info"), () => destinationInfo({ city: a.city })),
  );

  return server;
}
