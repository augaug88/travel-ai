import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { sanitizeError } from './mcp.js';

// Client for the Sorted Travel MCP server (https://sorted.travel/mcp).
// Kept separate from the Smithery client in lib/mcp.ts.

export const SORTED_SOURCE = 'sorted.travel';
const DEFAULT_URL = 'https://sorted.travel/mcp';
const MAX_ITEMS = 20;

export class SortedError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SortedError';
    this.status = status;
  }
}

let clientPromise: Promise<Client> | null = null;
let toolsByName: Map<string, Tool> | null = null;
let hasLoggedTools = false;

function statusFrom(err: unknown): number | undefined {
  const code = (err as any)?.code;
  if (typeof code === 'number' && code >= 400 && code < 600) return code;
  const match = String((err as any)?.message ?? err).match(/HTTP (\d{3})|\b(4\d\d|5\d\d)\b/);
  const found = match?.[1] || match?.[2];
  return found ? Number(found) : undefined;
}

async function connect(): Promise<Client> {
  const url = process.env.SORTED_TRAVEL_MCP_URL?.trim() || DEFAULT_URL;
  const headers: Record<string, string> = {};
  // Destination tools are zero-auth; only send a key when one is configured.
  if (process.env.SORTED_TRAVEL_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SORTED_TRAVEL_API_KEY}`;
  }

  const client = new Client({ name: 'voyager-sorted-client', version: '1.0.0' }, { capabilities: {} });
  const transport = new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } });
  transport.onerror = () => {
    console.error('Sorted Travel MCP transport error, invalidating cached client');
    clientPromise = null;
    toolsByName = null;
  };
  await client.connect(transport);

  const listed = await client.listTools();
  toolsByName = new Map((listed.tools || []).map((t) => [t.name, t]));
  if (!hasLoggedTools) {
    // Tool names only, never arguments or results.
    console.log('Sorted Travel tools:', [...toolsByName.keys()].join(', '));
    hasLoggedTools = true;
  }
  return client;
}

function getClient(forceReconnect = false): Promise<Client> {
  if (forceReconnect || !clientPromise) {
    clientPromise = connect().catch((err) => {
      clientPromise = null;
      toolsByName = null;
      throw new SortedError(`Could not connect to Sorted Travel MCP: ${sanitizeError(err)}`, statusFrom(err));
    });
  }
  return clientPromise;
}

async function getTool(name: string): Promise<Tool> {
  await getClient();
  const tool = toolsByName?.get(name);
  if (!tool) throw new SortedError(`Sorted Travel does not offer the tool "${name}"`);
  return tool;
}

function parseResponse(name: string, response: any): any {
  if (response?.isError) {
    const text = Array.isArray(response.content)
      ? response.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
      : '';
    throw new SortedError(`Sorted Travel ${name} returned an error: ${sanitizeError(text || 'no details')}`, statusFrom(text));
  }
  if (response?.structuredContent && typeof response.structuredContent === 'object') {
    return response.structuredContent;
  }
  const text = Array.isArray(response?.content)
    ? response.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim()
    : '';
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

async function call(name: string, args: Record<string, unknown>): Promise<any> {
  const run = async (client: Client) => parseResponse(name, await client.callTool({ name, arguments: args }));
  try {
    return await run(await getClient());
  } catch (err) {
    if (err instanceof SortedError && !String(err.message).startsWith('Could not connect')) throw err;
    const status = statusFrom(err);
    if (status === 429) {
      throw new SortedError('Sorted Travel rate limit reached (HTTP 429); wait a moment and try again', 429);
    }
    // Reconnect once on transport errors.
    try {
      return await run(await getClient(true));
    } catch (retryErr) {
      if (retryErr instanceof SortedError) throw retryErr;
      const retryStatus = statusFrom(retryErr);
      throw new SortedError(
        `Sorted Travel ${name} failed${retryStatus ? ` (HTTP ${retryStatus})` : ''}: ${sanitizeError(retryErr)}`,
        retryStatus
      );
    }
  }
}

// ---------- Argument mapping ----------
// Upstream parameter names come from the live tools/list schema (see docs/sorted-tools.json).
// Each semantic value lists the names it may appear under; only names present in the schema are sent.

type Prop = { type?: string | string[]; enum?: unknown[]; description?: string; items?: Prop };

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function propType(prop: Prop): string {
  const t = Array.isArray(prop.type) ? prop.type.find((x) => x !== 'null') : prop.type;
  return t || 'string';
}

function matchEnum(values: unknown[], candidates: unknown[]): unknown {
  for (const c of candidates) {
    const hit = values.find((v) => String(v).toLowerCase() === String(c).toLowerCase());
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function coerce(prop: Prop, value: unknown, kind?: 'month' | 'country'): unknown {
  const type = propType(prop);

  if (kind === 'month') {
    const n = Number(value);
    const name = MONTHS[n - 1];
    if (prop.enum) return matchEnum(prop.enum, [n, name, name?.slice(0, 3)]);
    if (type === 'integer' || type === 'number') return n;
    if (/yyyy-mm/i.test(prop.description || '')) {
      const now = new Date();
      const year = n < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      return `${year}-${String(n).padStart(2, '0')}`;
    }
    return name;
  }

  if (kind === 'country' && value && typeof value === 'object') {
    const { code, name } = value as { code: string; name: string };
    if (prop.enum) return matchEnum(prop.enum, [code, name]);
    return /alpha-2|iso|code/i.test(prop.description || '') ? code : name;
  }

  if (type === 'array') {
    const list = Array.isArray(value) ? value : String(value).split(',').map((s) => s.trim()).filter(Boolean);
    return list;
  }
  if (Array.isArray(value)) value = value.join(',');
  if (prop.enum) return matchEnum(prop.enum, [value]) ?? value;
  if (type === 'integer' || type === 'number') return Number(value);
  if (type === 'boolean') return value === true || value === 'true';
  return String(value);
}

interface ArgSpec {
  names: string[];
  value: unknown;
  kind?: 'month' | 'country';
}

function buildArgs(tool: Tool, specs: ArgSpec[]): Record<string, unknown> {
  const schema = (tool.inputSchema || {}) as { properties?: Record<string, Prop>; required?: string[] };
  const props = schema.properties || {};
  const args: Record<string, unknown> = {};

  for (const spec of specs) {
    if (spec.value === undefined || spec.value === null || spec.value === '') continue;
    if (Array.isArray(spec.value) && spec.value.length === 0) continue;
    const key = spec.names.find((n) => n in props);
    if (!key) continue;
    const coerced = coerce(props[key], spec.value, spec.kind);
    if (coerced !== undefined) args[key] = coerced;
  }

  // Fall back to the only required string field when none of the known names matched.
  const required = schema.required || [];
  const missing = required.filter((r) => !(r in args));
  if (missing.length === 1 && specs[0]?.value && Object.keys(args).length === 0) {
    args[missing[0]] = coerce(props[missing[0]] || {}, specs[0].value, specs[0].kind);
  }
  const stillMissing = required.filter((r) => !(r in args));
  if (stillMissing.length) {
    throw new SortedError(`Sorted Travel ${tool.name} needs: ${stillMissing.join(', ')}`, 400);
  }
  return args;
}

// ---------- Result helpers ----------

function firstOf(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

function findArray(data: any, keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const named = firstOf(data, keys);
  if (Array.isArray(named)) return named;
  if (named && typeof named === 'object') return findArray(named, keys);
  const anyArray = Object.values(data).find((v) => Array.isArray(v) && v.some((x) => x && typeof x === 'object'));
  return (anyArray as any[]) || [];
}

function imageOf(item: any): string | undefined {
  const img = firstOf(item, ['image', 'image_url', 'imageUrl', 'photo', 'photo_url', 'hero_image', 'thumbnail', 'cover']);
  if (typeof img === 'string') return img;
  return firstOf(img, ['url', 'src']);
}

export interface SortedPlace {
  handle?: string;
  name: string;
  country?: string;
  airport_code?: string;
  type?: string;
  score?: number | string;
  reason?: string;
  image?: string;
  place_url?: string;
  raw: unknown;
}

function toPlace(item: any): SortedPlace {
  const handle = firstOf(item, ['handle', 'slug', 'destination_handle', 'id']);
  const name = firstOf(item, ['name', 'title', 'display_name', 'destination', 'city', 'label']) ?? handle ?? 'Unnamed';
  const reason = firstOf(item, ['reason', 'why', 'summary', 'blurb', 'tagline', 'description', 'highlights']);
  return {
    handle: handle !== undefined ? String(handle) : undefined,
    name: typeof name === 'string' ? name : String(firstOf(name, ['name']) ?? handle),
    country: (() => {
      const c = firstOf(item, ['country', 'country_name', 'countryName']);
      return typeof c === 'string' ? c : firstOf(c, ['name']);
    })(),
    airport_code: firstOf(item, ['airport_code', 'iata', 'iata_code', 'airport']),
    type: firstOf(item, ['type', 'kind']),
    score: firstOf(item, ['score', 'match', 'match_score', 'rank_score', 'rating']),
    reason: Array.isArray(reason) ? reason.join(' · ') : typeof reason === 'string' ? reason : undefined,
    image: imageOf(item),
    place_url: firstOf(item, ['place_url', 'url']) || (handle ? `https://sorted.travel/places/${handle}` : undefined),
    raw: item,
  };
}

function stamp<T extends object>(data: T) {
  return { ...data, source: SORTED_SOURCE, fetched_at: new Date().toISOString() };
}

// ---------- Public functions ----------

export async function resolveDestination(query: string) {
  const q = query?.trim();
  if (!q) throw new SortedError('Enter a city, country, region or airport to look up', 400);
  const tool = await getTool('resolve_destination');
  const args = buildArgs(tool, [{ names: ['query', 'q', 'name', 'destination', 'place', 'text', 'search', 'location'], value: q }]);
  const data = await call(tool.name, args);
  const items = findArray(data, ['results', 'matches', 'destinations', 'candidates', 'data', 'items']);
  const matches = (items.length ? items : data && typeof data === 'object' && !Array.isArray(data) ? [data] : [])
    .slice(0, MAX_ITEMS)
    .map(toPlace);
  return stamp({ query: q, matches });
}

export interface RecommendFilters {
  from: string;
  month?: number;
  budget?: string;
  tags?: string[];
}

export async function getRecommendedDestinations(filters: RecommendFilters) {
  const from = filters.from?.trim().toUpperCase();
  if (!from) throw new SortedError('Choose a departure airport first', 400);
  const tool = await getTool('get_recommended_destinations');
  // Only filters the traveller set are sent; direct-flights-only is never turned on.
  const args = buildArgs(tool, [
    { names: ['from', 'origin', 'airport', 'airport_code', 'departure_airport', 'origin_airport', 'from_airport', 'departure', 'iata'], value: from },
    { names: ['month', 'travel_month', 'when', 'date'], value: filters.month, kind: 'month' },
    { names: ['budget', 'budget_level', 'max_budget', 'price'], value: filters.budget },
    { names: ['tags', 'interests', 'activities', 'themes', 'categories'], value: filters.tags },
  ]);
  const data = await call(tool.name, args);
  const items = findArray(data, ['destinations', 'results', 'recommendations', 'items', 'data', 'ranked']);
  return stamp({
    from,
    filters: args,
    destinations: items.slice(0, MAX_ITEMS).map(toPlace),
    discover_url: firstOf(data, ['discover_url']) || `https://sorted.travel/discover?type=best&from=${from}`,
  });
}

const HANDLE_NAMES = ['handle', 'destination', 'slug', 'destination_handle', 'place', 'id'];

export async function getDestinationInfo(handle: string) {
  const tool = await getTool('get_destination_info');
  const data = await call(tool.name, buildArgs(tool, [{ names: HANDLE_NAMES, value: handle }]));
  return stamp({ handle, info: data });
}

export async function getDestinationWeather(handle: string) {
  const tool = await getTool('get_destination_weather');
  const data = await call(tool.name, buildArgs(tool, [{ names: HANDLE_NAMES, value: handle }]));
  return stamp({ handle, weather: data, credit: 'Forecast by Foreca' });
}

export async function getDestinationDetails(handle: string) {
  const h = handle?.trim().toLowerCase();
  if (!h || !/^[a-z0-9-]+$/.test(h)) throw new SortedError('A Sorted destination handle looks like "lisbon"', 400);
  const [info, weather] = await Promise.all([getDestinationInfo(h), getDestinationWeather(h)]);
  return stamp({
    handle: h,
    info: info.info,
    weather: weather.weather,
    weather_credit: weather.credit,
    place_url: firstOf(info.info, ['place_url']) || `https://sorted.travel/places/${h}`,
  });
}

export interface Country {
  code: string;
  name: string;
}

export async function checkVisaRequirements(passport: Country, destination: string) {
  if (!passport?.code) throw new SortedError('Choose a passport country', 400);
  if (!destination?.trim()) throw new SortedError('Choose a destination', 400);
  const tool = await getTool('check_visa_requirements');
  const args = buildArgs(tool, [
    { names: ['passport', 'passport_country', 'nationality', 'citizenship', 'from_country', 'passport_country_code'], value: passport, kind: 'country' },
    { names: ['destination', 'destination_country', 'country', 'to_country', 'handle', 'destination_handle'], value: destination.trim() },
  ]);
  const data = await call(tool.name, args);
  return stamp({
    passport,
    destination: destination.trim(),
    visa: data,
    note: 'From the Sorted Travel visa table, not a government ruling. Check with an official government source before you fly.',
  });
}
