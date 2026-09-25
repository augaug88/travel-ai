import { useSyncExternalStore } from 'react';
import {
  Itinerary,
  PackingListResponse,
  WeatherInsights,
  CostEstimate,
  TravelGuide,
  TourItem,
  TourInquiryResponse,
  ExpertAnswer,
  SavedTripSummary,
  McpToolMeta,
  ServerStatus
} from '../types/travel.ts';

const LOCAL_STORAGE_TRIPS_KEY = 'plantrip_saved_trips_v1';

// ================= LOW-LEVEL MCP CLIENT (Streamable HTTP, /api/mcp) =================

const MCP_ENDPOINT = '/api/mcp';
const CLIENT_PROTOCOL_VERSION = '2025-11-25';
const REQUEST_TIMEOUT_MS = 15_000;

export class McpNotFoundError extends Error {
  constructor(message: string, public payload?: unknown) {
    super(message);
    this.name = 'McpNotFoundError';
  }
}

export class McpToolError extends Error {
  constructor(message: string, public payload?: unknown) {
    super(message);
    this.name = 'McpToolError';
  }
}

class McpTransportError extends Error {
  constructor(message: string, public offline: boolean) {
    super(message);
    this.name = 'McpTransportError';
  }
}

export interface McpCallResult<T = any> {
  data: T;
  source: string;
  rawPayload: unknown;
  latency: number;
}

// ---- Status store, read by useMcpStatus() ----
export interface McpStatusSnapshot {
  state: 'unknown' | 'online' | 'offline';
  latencyMs: number | null;
  lastSource: string | null;
  lastError: string | null;
}

let statusSnapshot: McpStatusSnapshot = { state: 'unknown', latencyMs: null, lastSource: null, lastError: null };
const statusListeners = new Set<() => void>();

function setStatus(patch: Partial<McpStatusSnapshot>) {
  statusSnapshot = { ...statusSnapshot, ...patch };
  statusListeners.forEach((l) => l());
}

export function useMcpStatus(): McpStatusSnapshot {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => statusSnapshot,
    () => statusSnapshot
  );
}

// ---- JSON-RPC over HTTP ----
let nextId = 1;
let negotiatedVersion: string | null = null;
let initPromise: Promise<void> | null = null;

async function postRpc(message: Record<string, unknown>): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream'
  };
  if (negotiatedVersion) headers['MCP-Protocol-Version'] = negotiatedVersion;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(MCP_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(message), signal: controller.signal });
  } catch (err: any) {
    throw new McpTransportError(
      err?.name === 'AbortError' ? 'The MCP server did not answer within 15 seconds.' : 'Could not reach the MCP server.',
      true
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 202) return null; // notification accepted
  if (res.status >= 500) throw new McpTransportError(`The MCP server failed (HTTP ${res.status}).`, true);

  const contentType = res.headers.get('content-type') || '';
  let body: any = null;
  try {
    if (contentType.includes('text/event-stream')) {
      const text = await res.text();
      const dataLines = text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
      body = dataLines.length ? JSON.parse(dataLines[dataLines.length - 1]) : null;
    } else {
      body = await res.json();
    }
  } catch {
    throw new McpTransportError(`The MCP server sent an unreadable reply (HTTP ${res.status}).`, !res.ok);
  }

  if (body?.error) throw new McpTransportError(body.error.message || `MCP error ${body.error.code}`, false);
  if (!res.ok) throw new McpTransportError(`The MCP server rejected the request (HTTP ${res.status}).`, false);
  return body?.result;
}

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const result = await postRpc({
        jsonrpc: '2.0',
        id: nextId++,
        method: 'initialize',
        params: {
          protocolVersion: CLIENT_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: 'plantrip-web', version: '2.0.0' }
        }
      });
      negotiatedVersion = result?.protocolVersion || CLIENT_PROTOCOL_VERSION;
      await postRpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    })().catch((err) => {
      initPromise = null;
      negotiatedVersion = null;
      throw err;
    });
  }
  return initPromise;
}

async function request(method: string, params: Record<string, unknown>): Promise<{ result: any; latency: number }> {
  const started = performance.now();
  try {
    await ensureInitialized();
    const result = await postRpc({ jsonrpc: '2.0', id: nextId++, method, params });
    const latency = Math.round(performance.now() - started);
    setStatus({ state: 'online', latencyMs: latency, lastError: null });
    return { result, latency };
  } catch (err: any) {
    if (err instanceof McpTransportError && err.offline) {
      initPromise = null;
      setStatus({ state: 'offline', latencyMs: null, lastError: err.message });
    } else {
      setStatus({ state: 'online', latencyMs: Math.round(performance.now() - started), lastError: err?.message ?? null });
    }
    throw err;
  }
}

/** Call an MCP tool on this app's server. Throws McpNotFoundError / McpToolError on tool errors. */
export async function callMcp<T = any>(tool: string, args: Record<string, any> = {}): Promise<McpCallResult<T>> {
  const { result, latency } = await request('tools/call', { name: tool, arguments: args });
  const payload = result?.structuredContent ?? parseTextPayload(result);

  if (result?.isError) {
    const message = payload?.message || firstText(result) || `${tool} failed.`;
    if (payload?.found === false) throw new McpNotFoundError(message, payload);
    throw new McpToolError(message, result);
  }

  const source = payload?.source || 'Unknown source';
  setStatus({ lastSource: source });
  return { data: payload?.result as T, source, rawPayload: result, latency };
}

/** List the tools the server actually registers. */
export async function listMcpTools(): Promise<{ tools: McpToolMeta[]; rawPayload: unknown }> {
  const { result } = await request('tools/list', {});
  return { tools: result?.tools || [], rawPayload: result };
}

function firstText(result: any): string | undefined {
  return result?.content?.find((c: any) => c.type === 'text')?.text;
}

function parseTextPayload(result: any): any {
  const texts = (result?.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text);
  for (let i = texts.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(texts[i]);
    } catch {
      /* not JSON */
    }
  }
  return null;
}

/** A sentence suitable for showing on screen. */
export function describeMcpError(err: unknown): string {
  if (err instanceof McpNotFoundError) return err.message;
  if (err instanceof McpTransportError) return err.offline ? `${err.message} The MCP server is offline.` : err.message;
  if (err instanceof McpToolError) return `The tool reported an error: ${err.message}`;
  return (err as any)?.message || 'Something went wrong while calling the MCP server.';
}

// ================= TOOL WRAPPERS USED BY THE SCREENS =================

async function tool<T>(name: string, args: Record<string, any> = {}): Promise<T> {
  return (await callMcp<T>(name, args)).data;
}

export class McpClientService {
  /** Server status from /api/status (throws when unreachable). */
  static async getStatus(): Promise<ServerStatus> {
    const res = await fetch('/api/status', { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Status check failed (HTTP ${res.status})`);
    return res.json();
  }

  static async getTools(): Promise<McpToolMeta[]> {
    return (await listMcpTools()).tools;
  }

  static async callTool<T = any>(name: string, args: Record<string, any> = {}): Promise<T> {
    return tool<T>(name, args);
  }

  // 1. create_itinerary
  static async createItinerary(params: {
    destination: string;
    duration_days?: number;
    start_date?: string;
    budget?: 'budget' | 'moderate' | 'luxury';
    travel_style?: 'cultural' | 'foodie' | 'adventure' | 'relaxed' | 'family' | 'romantic' | 'solo';
    travelers?: number;
    interests?: string[];
    notes?: string;
  }): Promise<{ status: string; itinerary_id: string; message: string; itinerary?: Itinerary }> {
    return tool('create_itinerary', params);
  }

  // 2. get_itinerary_status
  static async getItineraryStatus(itinerary_id: string): Promise<{
    itinerary_id: string;
    status: string;
    progress: number;
    message: string;
  }> {
    return tool('get_itinerary_status', { itinerary_id });
  }

  // 3. get_itinerary (throws McpNotFoundError when the server does not hold it)
  static async getItinerary(itinerary_id: string): Promise<{
    itinerary: Itinerary | null;
    found: boolean;
    message: string;
  }> {
    return tool('get_itinerary', { itinerary_id });
  }

  // 4. modify_itinerary — sends the itinerary too, since serverless instances do not share memory
  static async modifyItinerary(itinerary: Itinerary, modification_request: string): Promise<{
    success: boolean;
    itinerary: Itinerary;
    message: string;
  }> {
    return tool('modify_itinerary', { itinerary_id: itinerary.id, modification_request, itinerary });
  }

  // 5. list_user_trips, merged with trips this browser saved
  static async listUserTrips(): Promise<SavedTripSummary[]> {
    const result = await tool<{ trips: SavedTripSummary[] }>('list_user_trips', {});
    const serverTrips = result?.trips || [];

    const localTrips = readLocalTrips();
    const map = new Map<string, SavedTripSummary>();
    serverTrips.forEach((t) => map.set(t.id, t));
    localTrips.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }

  // 6. save_itinerary
  static async saveItinerary(itinerary: Itinerary, title?: string): Promise<{ success: boolean; trip_id: string; message: string }> {
    const result = await tool<{ success: boolean; trip_id: string; message: string }>('save_itinerary', { itinerary, title });

    try {
      const existing = readLocalTrips();
      const updated: SavedTripSummary[] = [
        {
          id: itinerary.id,
          title: title || itinerary.title,
          destination: itinerary.destination,
          durationDays: itinerary.durationDays,
          startDate: itinerary.startDate,
          budgetTier: itinerary.budgetTier,
          travelStyle: itinerary.travelStyle,
          travelersCount: itinerary.travelersCount,
          totalCost: itinerary.totalEstimatedCost,
          heroImage: itinerary.destination.toLowerCase().includes('japan') || itinerary.destination.toLowerCase().includes('kyoto')
            ? 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80'
            : itinerary.destination.toLowerCase().includes('paris')
            ? 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'
            : 'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80',
          createdAt: new Date().toISOString()
        },
        ...existing.filter((t) => t.id !== itinerary.id)
      ];
      localStorage.setItem(LOCAL_STORAGE_TRIPS_KEY, JSON.stringify(updated));
      localStorage.setItem(`plantrip_full_${itinerary.id}`, JSON.stringify(itinerary));
    } catch {
      // storage unavailable (private window); the server copy still exists
    }

    return result;
  }

  // 7. delete_trip — removes this browser's copy, then the server's
  static async deleteTrip(trip_id: string): Promise<{ success: boolean; message: string }> {
    const wasLocal = removeLocalTrip(trip_id);
    try {
      return await tool('delete_trip', { trip_id });
    } catch (err) {
      // A trip saved on another serverless instance only exists in this browser.
      if (err instanceof McpNotFoundError && wasLocal) {
        return { success: true, message: `Trip ${trip_id} removed from this browser.` };
      }
      throw err;
    }
  }

  // 8. generate_packing_list
  static async generatePackingList(params: {
    destination: string;
    duration_days?: number;
    season_or_month?: string;
    activities?: string[];
    travelers_type?: string;
  }): Promise<PackingListResponse> {
    return tool('generate_packing_list', params);
  }

  // 9. ask_travel_expert
  static async askTravelExpert(params: {
    question: string;
    destination: string;
    travel_context?: string;
  }): Promise<ExpertAnswer> {
    return tool('ask_travel_expert', params);
  }

  // 10. get_weather_insights
  static async getWeatherInsights(params: {
    destination: string;
    month?: string | number;
  }): Promise<WeatherInsights> {
    return tool('get_weather_insights', params);
  }

  // 11. estimate_trip_cost
  static async estimateTripCost(params: {
    destination: string;
    duration_days?: number;
    travel_style?: 'budget' | 'moderate' | 'luxury';
    travelers?: number;
  }): Promise<CostEstimate> {
    return tool('estimate_trip_cost', params);
  }

  // 12. search_guides
  static async searchGuides(params: {
    query?: string;
    destination?: string;
    category?: string;
  }): Promise<{ guides: TravelGuide[]; count: number }> {
    return tool('search_guides', params);
  }

  // 13. get_tour_availability
  static async getTourAvailability(params: {
    destination?: string;
    tour_type?: string;
    date?: string;
  }): Promise<{ tours: TourItem[]; destination: string }> {
    return tool('get_tour_availability', params);
  }

  // 14. submit_tour_inquiry (demo only: nothing is booked or emailed)
  static async submitTourInquiry(params: {
    tour_id?: string;
    tour_title?: string;
    destination?: string;
    traveler_name: string;
    email: string;
    preferred_date: string;
    travelers_count: number;
    special_requests?: string;
  }): Promise<TourInquiryResponse> {
    return tool('submit_tour_inquiry', params);
  }

  // AI concierge (server picks an MCP tool, Gemini writes the reply)
  static async askChatbot(params: {
    message: string;
    destination?: string;
    durationDays?: number;
    budgetTier?: 'budget' | 'moderate' | 'luxury';
  }): Promise<{
    success: boolean;
    reply: string;
    mcpToolUsed: string;
    mcpToolArgs: Record<string, any>;
    mcpData: any;
    destination: string;
    suggestions: string[];
  }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30_000)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || 'Chatbot request failed');
    }
    return await res.json();
  }
}

function readLocalTrips(): SavedTripSummary[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function removeLocalTrip(trip_id: string): boolean {
  try {
    const trips = readLocalTrips();
    const filtered = trips.filter((t) => t.id !== trip_id);
    localStorage.setItem(LOCAL_STORAGE_TRIPS_KEY, JSON.stringify(filtered));
    localStorage.removeItem(`plantrip_full_${trip_id}`);
    return filtered.length !== trips.length;
  } catch {
    return false;
  }
}
