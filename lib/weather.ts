import { buildArgs } from "./args.js";
import { CAP, MissingCapabilityError, resolveTool, tryResolveTool, type ResolvedTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso, UpstreamError } from "./errors.js";
import { findList, flattenText, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { AbroadWeatherResponse, SgWeatherResponse } from "./types.js";

const SG_SOURCE = "vdineshk/sg-weather-data-mcp";

async function callSg(tool: ResolvedTool, area?: string): Promise<unknown> {
  const args = buildArgs(tool, [
    { aliases: ["area", "location", "region", "town", "place", "name", "query"], value: area },
  ]);
  return callTool(tool.name, args);
}

/** Filter a forecast list to the requested area when the payload is a list of areas. */
function filterArea(payload: unknown, area?: string): unknown {
  if (!area) return payload;
  const list = findList(payload);
  if (!list.length) return payload;
  const needle = area.toLowerCase();
  const hits = list.filter((row) => flattenText(row).toLowerCase().includes(needle));
  return hits.length ? hits : payload;
}

export async function sgWeather(params: { area?: string }): Promise<SgWeatherResponse> {
  const [t2h, t24h, tRain] = await Promise.all([tryResolveTool(CAP.sgWeather2h), tryResolveTool(CAP.sgWeather24h), tryResolveTool(CAP.sgRain)]);
  let tools: { key: "forecast_2h" | "forecast_24h" | "rainfall"; tool: ResolvedTool }[] = [];
  if (t2h) tools.push({ key: "forecast_2h", tool: t2h });
  if (t24h) tools.push({ key: "forecast_24h", tool: t24h });
  if (tRain) tools.push({ key: "rainfall", tool: tRain });
  if (tools.length === 0) {
    const any = await tryResolveTool(CAP.sgWeatherAny);
    if (!any) throw new MissingCapabilityError(CAP.sgWeatherAny.key, CAP.sgWeatherAny.label);
    tools = [{ key: "forecast_2h", tool: any }];
  }

  const results = await Promise.allSettled(tools.map((t) => callSg(t.tool, params.area)));
  const out: SgWeatherResponse = { area: params.area, sources: {}, source: SG_SOURCE, fetched_at: nowIso(), raw: {} };
  const rawAll: Record<string, unknown> = {};
  const failures: string[] = [];
  results.forEach((r, i) => {
    const { key, tool } = tools[i];
    out.sources[key] = tool.name;
    if (r.status === "fulfilled") {
      rawAll[key] = r.value;
      out[key] = filterArea(r.value, params.area);
    } else {
      failures.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
    }
  });
  out.raw = rawAll;
  if (failures.length === results.length) throw new UpstreamError(SG_SOURCE, failures.join("; "));
  if (failures.length) rawAll.partial_failures = failures;
  return out;
}

export async function abroadWeather(params: { city: string }): Promise<AbroadWeatherResponse> {
  if (!params.city.trim()) throw new BadRequestError("city is required");
  const tool = await resolveTool(CAP.abroadWeather);
  try {
    const args = buildArgs(tool, [
      { aliases: ["city", "city_name", "location", "place", "q", "query", "name"], value: params.city },
      { aliases: ["units", "unit"], value: "metric" },
    ]);
    const raw = await callTool(tool.name, args);
    return {
      city: params.city,
      summary: typeof raw === "string" ? raw : undefined,
      temperature: pickNumber(raw, ["temperature", "temp", "temp_c", "temperature_c", "current_temperature", "temperature_2m"]),
      temperature_unit: pickString(raw, ["temperature_unit", "unit", "units"]) ?? (typeof raw === "object" && raw !== null ? "°C" : undefined),
      condition: pickString(raw, ["condition", "description", "weather", "summary", "weather_description", "conditions", "text"]),
      source: tool.source,
      fetched_at: nowIso(),
      raw,
    };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}
