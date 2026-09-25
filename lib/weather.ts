import { buildArgs } from "./args.js";
import { CAP, MissingCapabilityError, resolveTool, tryResolveTool, type ResolvedTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso, UpstreamError } from "./errors.js";
import { resolveDestinationHandle } from "./destination.js";
import { findList, flattenText, pick, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { AbroadWeatherResponse, DailyForecast, SgWeatherResponse } from "./types.js";

const SG_SOURCE = "vdineshk/sg-weather-data-mcp";

async function callSg(tool: ResolvedTool, area?: string, period?: string): Promise<unknown> {
  const args = buildArgs(tool, [
    { aliases: ["area", "location", "region", "town", "place", "name", "query"], value: area },
    { aliases: ["period", "range", "horizon"], value: period },
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

  const results = await Promise.allSettled(tools.map((t) => callSg(t.tool, params.area, t.key === "forecast_24h" ? "24h" : undefined)));
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
    const props = (tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    // Sorted-style tools take a destination handle: resolve the city first.
    const resolved = "destination_handle" in props ? await resolveDestinationHandle(params.city) : null;
    const args = buildArgs(tool, [
      { aliases: ["destination_handle", "handle"], value: resolved?.handle },
      { aliases: ["city", "city_name", "location", "place", "q", "query", "name"], value: params.city },
      { aliases: ["units", "unit"], value: "metric" },
    ]);
    const raw = await callTool(tool.name, args);
    const days = findList(pick(raw, ["weather_forecast", "forecast", "daily"]) ?? null);
    const forecast: DailyForecast[] = days.slice(0, 7).map((d) => ({
      date: pickString(d, ["date", "day"]),
      weekday: pickString(d, ["weekday"]),
      min_temp: pickNumber(d, ["min_temp", "temp_min", "min"]),
      max_temp: pickNumber(d, ["max_temp", "temp_max", "max"]),
      precip_prob: pickNumber(d, ["precip_prob", "precipitation_probability", "pop"]),
      precip_mm: pickNumber(d, ["precip_mm", "precipitation"]),
      humidity: pickNumber(d, ["humidity"]),
    }));
    const today = forecast[0];
    const summaryFromForecast = today
      ? `${today.weekday ?? ""} ${today.date ?? ""}: ${today.min_temp ?? "?"}–${today.max_temp ?? "?"}°C, ${today.precip_prob ?? "?"}% chance of rain`.trim()
      : undefined;
    return {
      city: params.city,
      resolved_name: resolved?.name ?? pickString(raw, ["name"]),
      forecast: forecast.length ? forecast : undefined,
      best_time_summary: pickString(raw, ["best_time_summary"]),
      attribution: pickString(raw, ["weather_attribution", "attribution"]),
      place_url: pickString(raw, ["place_url"]),
      summary: typeof raw === "string" ? raw : summaryFromForecast,
      temperature: pickNumber(raw, ["temperature", "temp", "temp_c", "temperature_c", "current_temperature", "temperature_2m"]) ?? today?.max_temp,
      temperature_unit: pickString(raw, ["temperature_unit"]) ?? (typeof raw === "object" && raw !== null ? "°C" : undefined),
      condition: pickString(raw, ["condition", "description", "weather", "summary", "weather_description", "conditions", "text"]),
      source: tool.source,
      fetched_at: nowIso(),
      raw,
    };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}
