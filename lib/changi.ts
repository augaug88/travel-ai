import { buildArgs } from "./args.js";
import { CAP, resolveTool, tryResolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { findList, flattenText, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { ChangiResponse, TrafficIncident } from "./types.js";

/** Expressways that feed Changi Airport, with the phrases LTA uses in incident text. */
const ROUTE_ROADS: { code: string; patterns: RegExp }[] = [
  { code: "ECP", patterns: /\bECP\b|East Coast Parkway/i },
  { code: "PIE", patterns: /\bPIE\b|Pan[- ]Island Expressway/i },
  { code: "TPE", patterns: /\bTPE\b|Tampines Expressway/i },
  { code: "KPE", patterns: /\bKPE\b|Kallang[- ]Paya Lebar Expressway/i },
];

const BASE_LEAD_MINUTES = 180; // arrive 3 h before departure
const BUFFER_PER_INCIDENT = 15;
const SG_OFFSET = "+08:00";

/** Accept "HH:mm" (today, Singapore time) or an ISO date-time; returns a Date. */
export function parseFlightTime(input: string): Date {
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(input);
  if (hhmm) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return new Date(`${today}T${hhmm[1].padStart(2, "0")}:${hhmm[2]}:00${SG_OFFSET}`);
  }
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(input);
  const d = new Date(hasZone ? input : `${input}${input.includes("T") ? "" : "T00:00:00"}${SG_OFFSET}`);
  if (Number.isNaN(d.getTime())) throw new BadRequestError('flight_time must be "HH:mm" or an ISO date-time, e.g. 2026-10-03T23:45');
  return d;
}

export function toSgIso(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour").replace("24", "00")}:${get("minute")}:${get("second")}${SG_OFFSET}`;
}

export function roadsIn(text: string): string[] {
  return ROUTE_ROADS.filter((r) => r.patterns.test(text)).map((r) => r.code);
}

export async function changiPlan(params: { from?: string; flight_time: string }): Promise<ChangiResponse> {
  const flight = parseFlightTime(params.flight_time);
  const tool = await resolveTool(CAP.trafficIncidents);
  try {
    const args = buildArgs(tool, []); // incident feeds take no parameters we need to supply
    const raw = await callTool(tool.name, args);
    const all = findList(raw);
    const incidents: TrafficIncident[] = all.map((item) => {
      const message = pickString(item, ["Message", "message", "description", "text", "details"]);
      const type = pickString(item, ["Type", "type", "category", "kind"]);
      return {
        type,
        message,
        latitude: pickNumber(item, ["Latitude", "latitude", "lat"]),
        longitude: pickNumber(item, ["Longitude", "longitude", "lng", "lon"]),
        roads: roadsIn(flattenText(item)),
        raw: item,
      };
    });
    const onRoute = incidents.filter((i) => i.roads.length > 0);
    const buffer = onRoute.length * BUFFER_PER_INCIDENT;
    const leaveBy = new Date(flight.getTime() - (BASE_LEAD_MINUTES + buffer) * 60_000);

    // Optional: expressway travel times if the toolbox has them (never required).
    let travel_times: ChangiResponse["travel_times"] = null;
    const ttTool = await tryResolveTool(CAP.travelTimes);
    if (ttTool) {
      try {
        const ttRaw = await callTool(ttTool.name, buildArgs(ttTool, []));
        const rows = findList(ttRaw).filter((r) => roadsIn(flattenText(r)).length > 0);
        travel_times = { source: ttTool.source, raw: rows.length ? rows : ttRaw };
      } catch {
        travel_times = null; // reported as absent, never faked
      }
    }

    return {
      from: params.from,
      flight_time: toSgIso(flight),
      leave_by: toSgIso(leaveBy),
      base_lead_minutes: BASE_LEAD_MINUTES,
      incident_buffer_minutes: buffer,
      route_roads: ROUTE_ROADS.map((r) => r.code),
      incidents_on_route: onRoute,
      total_incidents: incidents.length,
      travel_times,
      source: tool.source,
      fetched_at: nowIso(),
      raw,
    };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}
