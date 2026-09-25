import { buildArgs } from "./args.js";
import { CAP, resolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { findList, pickNumber, pickPrice, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { FlightOption, FlightsResponse } from "./types.js";

const IATA = /^[A-Z]{3}$/;

export async function searchFlights(params: { from: string; to: string; depart: string; ret?: string }): Promise<FlightsResponse> {
  const from = params.from.toUpperCase();
  const to = params.to.toUpperCase();
  if (!IATA.test(from) || !IATA.test(to)) throw new BadRequestError("from/to must be 3-letter IATA codes, e.g. SIN and NRT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.depart)) throw new BadRequestError("depart must be YYYY-MM-DD");
  if (params.ret && !/^\d{4}-\d{2}-\d{2}$/.test(params.ret)) throw new BadRequestError("return must be YYYY-MM-DD");

  const tool = await resolveTool(CAP.flights);
  try {
    const args = buildArgs(tool, [
      { aliases: ["origin", "from", "flyFrom", "fly_from", "departure", "source", "departure_airport", "origin_airport", "from_airport", "departure_id", "origin_code", "from_city"], value: from },
      { aliases: ["destination", "to", "flyTo", "fly_to", "arrival", "arrival_airport", "destination_airport", "to_airport", "arrival_id", "destination_code", "to_city"], value: to },
      { aliases: ["date", "departure_date", "departureDate", "depart_date", "departDate", "outbound_date", "outboundDate", "depart", "start_date", "startDate"], value: params.depart },
      { aliases: ["return_date", "returnDate", "inbound_date", "inboundDate", "return", "end_date", "endDate"], value: params.ret },
      { aliases: ["currency", "curr", "cur"], value: "SGD" },
      { aliases: ["market", "market_code", "country", "country_code"], value: "SG" },
      { aliases: ["adults", "passengers", "travellers", "travelers", "adult"], value: 1 },
      { aliases: ["limit", "max_results", "maxResults", "results", "count"], value: 20 },
      { aliases: ["sort", "sort_by", "sortBy"], value: "price" },
    ]);
    const raw = await callTool(tool.name, args);
    const options = findList(raw).slice(0, 20).map(normalizeFlight);
    return { from, to, depart: params.depart, return: params.ret, options, source: tool.source, fetched_at: nowIso(), raw };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

interface Segment {
  marketing_carrier_code?: string;
  flight_number?: string;
  operating_carrier_name?: string;
  departure_airport?: string;
  departure_time_local?: string;
  arrival_airport?: string;
  arrival_time_local?: string;
}
interface Leg {
  carrier?: string | null;
  duration_minutes?: number | null;
  segments?: Segment[];
}

const minutes = (m: number | null | undefined): string | undefined =>
  typeof m === "number" ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : undefined;

/** Itinerary shape with an outbound leg made of segments (Ignav and similar). */
function normalizeLeg(item: Record<string, unknown>, price: { amount?: number; currency?: string }): FlightOption | null {
  const leg = (item.outbound ?? item.itinerary ?? null) as Leg | null;
  const segments = leg?.segments ?? (Array.isArray(item.segments) ? (item.segments as Segment[]) : undefined);
  if (!segments || segments.length === 0) return null;
  const first = segments[0];
  const last = segments[segments.length - 1];
  const inbound = item.inbound as Leg | undefined;
  const flightNos = segments.map((s) => `${s.marketing_carrier_code ?? ""}${s.flight_number ?? ""}`).filter(Boolean);
  return {
    airline: leg?.carrier ?? first.operating_carrier_name ?? first.marketing_carrier_code ?? undefined,
    flight_number: flightNos.join(" / ") || undefined,
    from: first.departure_airport,
    to: last.arrival_airport,
    departure: first.departure_time_local,
    arrival: last.arrival_time_local,
    duration: [minutes(leg?.duration_minutes), inbound ? `return ${minutes(inbound.duration_minutes) ?? ""}`.trim() : undefined].filter(Boolean).join(" · ") || undefined,
    stops: segments.length - 1,
    price: price.amount,
    currency: price.currency,
    booking_url: pickString(item, ["booking_url", "bookingUrl", "deep_link", "deepLink", "link", "url"]),
    raw: item,
  };
}

function normalizeFlight(item: Record<string, unknown>): FlightOption {
  const price = pickPrice(item);
  const legged = normalizeLeg(item, price);
  if (legged) return legged;
  return {
    airline: pickString(item, ["airline", "airlines", "carrier", "marketing_carrier", "operating_carrier", "airline_name"]),
    flight_number: pickString(item, ["flight_number", "flightNumber", "flight_no", "number", "flight"]),
    from: pickString(item, ["origin", "from", "flyFrom", "departure_airport", "origin_airport", "cityFrom"]),
    to: pickString(item, ["destination", "to", "flyTo", "arrival_airport", "destination_airport", "cityTo"]),
    departure: pickString(item, ["departure", "departure_time", "departureTime", "local_departure", "depart", "dTime", "departure_at"]),
    arrival: pickString(item, ["arrival", "arrival_time", "arrivalTime", "local_arrival", "arrive", "aTime", "arrival_at"]),
    duration: pickString(item, ["duration", "total_duration", "flight_duration", "fly_duration"]),
    stops: pickNumber(item, ["stops", "stopovers", "number_of_stops", "layovers"]),
    price: price.amount,
    currency: price.currency,
    booking_url: pickString(item, ["booking_url", "bookingUrl", "deep_link", "deepLink", "link", "url"]),
    raw: item,
  };
}
