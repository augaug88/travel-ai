import { buildArgs } from "./args.js";
import { CAP, resolveTool, tryResolveTool, type ResolvedTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { findList, pick, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { DestinationResponse, NamedItem } from "./types.js";

export interface ResolvedDestination {
  handle: string;
  name?: string;
  country?: string;
  airport_code?: string;
  raw: unknown;
}

/** Map a free-text city onto the provider's destination handle (never guessed). */
export async function resolveDestinationHandle(city: string): Promise<ResolvedDestination> {
  const tool = await resolveTool(CAP.resolveDestination);
  try {
    const args = buildArgs(tool, [
      { aliases: ["query", "q", "city", "place", "name"], value: city },
      { aliases: ["page_size", "limit"], value: 1 },
    ]);
    const raw = await callTool(tool.name, args);
    const first = findList(raw)[0];
    const handle = first ? pickString(first, ["handle", "slug", "id"]) : undefined;
    if (!handle) throw new Error(`no destination matched "${city}"`);
    return {
      handle,
      name: pickString(first, ["name", "short_name"]),
      country: pickString(first, ["country"]),
      airport_code: pickString(first, ["airport_code", "iata"]),
      raw,
    };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

function namedItems(raw: unknown): NamedItem[] {
  const list = findList(raw);
  return list.slice(0, 30).map((it) => ({
    name: pickString(it, ["name", "title", "tip", "event", "heading"]),
    description: pickString(it, ["description", "text", "details", "summary", "content", "note"]),
    date: pickString(it, ["date", "dates", "when", "month", "start_date"]),
    category: pickString(it, ["category", "type", "kind"]),
    raw: it,
  }));
}

/** Call an optional Pulse-style city tool; never required, never faked. */
async function optionalCityTool(tool: ResolvedTool | null, city: string): Promise<DestinationResponse["events"]> {
  if (!tool) return null;
  try {
    const raw = await callTool(tool.name, buildArgs(tool, [
      { aliases: ["city", "destination", "query", "location"], value: city },
      { aliases: ["category"], value: "all" },
    ]));
    return { source: tool.source, items: namedItems(raw), raw };
  } catch {
    return null;
  }
}

export async function destinationInfo(params: { city: string }): Promise<DestinationResponse> {
  if (!params.city.trim()) throw new BadRequestError("city is required");
  const resolved = await resolveDestinationHandle(params.city);
  const tool = await resolveTool(CAP.destinationInfo);
  try {
    const args = buildArgs(tool, [{ aliases: ["destination_handle", "handle"], value: resolved.handle }]);
    const raw = await callTool(tool.name, args);
    const brief = pick(raw, ["brief"]);
    const taxi = pick(raw, ["taxi_apps"]);
    const [eventsTool, tipsTool] = await Promise.all([tryResolveTool(CAP.events), tryResolveTool(CAP.localTips)]);
    const [events, local_tips] = await Promise.all([optionalCityTool(eventsTool, params.city), optionalCityTool(tipsTool, params.city)]);
    return {
      city: params.city,
      handle: resolved.handle,
      name: pickString(raw, ["name"]) ?? resolved.name,
      country: pickString(raw, ["country"]) ?? resolved.country,
      airport_code: pickString(raw, ["airport_code"]) ?? resolved.airport_code,
      currency_code: pickString(raw, ["currency_code"]),
      currency_name: pickString(raw, ["currency_name"]),
      phone_code: pickString(raw, ["phone_code"]),
      safety_level: pickNumber(raw, ["safety_level"]),
      brief: typeof brief === "string" ? brief : pickString(brief, ["brief_text", "text"]),
      brief_updated: pickString(brief, ["update_date"]),
      taxi_apps: Array.isArray(taxi) ? taxi.map((t) => pickString(t, ["name"]) ?? "").filter(Boolean) : undefined,
      place_url: pickString(raw, ["place_url"]),
      events,
      local_tips,
      source: tool.source,
      fetched_at: nowIso(),
      raw,
    };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}
