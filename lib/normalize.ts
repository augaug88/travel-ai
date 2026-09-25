/**
 * Best-effort readers over unknown JSON returned by tools. These never
 * fabricate values: a missing field stays undefined and the raw payload is
 * always returned alongside so the UI can show it.
 */
export type Json = unknown;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const LIST_KEYS = [
  "data", "results", "result", "items", "flights", "itineraries", "offers", "hotels", "properties",
  "attractions", "locations", "places", "value", "list", "records", "incidents", "forecasts",
];

/** Find the most plausible list of records in a payload. */
export function findList(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    if (payload.every(isObj)) return payload as Record<string, unknown>[];
    // array of arrays / scalars → dig into the first object-array found
    for (const p of payload) {
      const inner = findList(p, depth + 1);
      if (inner.length) return inner;
    }
    return [];
  }
  if (!isObj(payload) || depth > 4) return [];
  for (const k of LIST_KEYS) {
    if (k in payload) {
      const inner = findList(payload[k], depth + 1);
      if (inner.length) return inner;
    }
  }
  let best: Record<string, unknown>[] = [];
  for (const v of Object.values(payload)) {
    const inner = findList(v, depth + 1);
    if (inner.length > best.length) best = inner;
  }
  return best;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Depth-limited lookup of the first key matching any alias. */
export function pick(obj: unknown, keys: string[], depth = 0): unknown {
  if (!isObj(obj) || depth > 3) return undefined;
  const wanted = keys.map(norm);
  for (const [k, v] of Object.entries(obj)) {
    if (wanted.includes(norm(k)) && v !== null && v !== undefined && v !== "") return v;
  }
  for (const v of Object.values(obj)) {
    if (isObj(v)) {
      const found = pick(v, keys, depth + 1);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function pickNumber(obj: unknown, keys: string[]): number | undefined {
  const v = pick(obj, keys);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n) && v.trim() !== "") return n;
  }
  if (isObj(v)) {
    const inner = pickNumber(v, ["amount", "value", "total", "price"]);
    if (inner !== undefined) return inner;
  }
  return undefined;
}

export function pickString(obj: unknown, keys: string[]): string | undefined {
  const v = pick(obj, keys);
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (isObj(v)) {
    const inner = pickString(v, ["name", "text", "value", "code", "iata"]);
    if (inner !== undefined) return inner;
  }
  return undefined;
}

/** Extract a price + currency pair from a record. */
export function pickPrice(obj: unknown): { amount?: number; currency?: string } {
  const amount = pickNumber(obj, ["price", "total_price", "totalPrice", "total", "amount", "fare", "cost", "rate", "price_per_night", "pricePerNight", "conversion"]);
  const currency = pickString(obj, ["currency", "currency_code", "currencyCode", "curr", "cur"]);
  return { amount, currency };
}

/** Collect all strings nested in a value (for text search). */
export function flattenText(v: unknown, depth = 0): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (depth > 4 || v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => flattenText(x, depth + 1)).join(" ");
  if (isObj(v)) return Object.values(v).map((x) => flattenText(x, depth + 1)).join(" ");
  return "";
}
