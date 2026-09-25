/** Response shapes shared (type-only) between lib/ and src/. No runtime code. */

export interface Sourced {
  source: string;
  fetched_at: string;
  /** Untouched tool payload (JSON or text) so nothing is hidden or invented. */
  raw: unknown;
}

export interface FlightOption {
  airline?: string;
  flight_number?: string;
  from?: string;
  to?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
  stops?: number;
  price?: number;
  currency?: string;
  booking_url?: string;
  raw: unknown;
}
export interface FlightsResponse extends Sourced {
  from: string;
  to: string;
  depart: string;
  return?: string;
  options: FlightOption[];
}

export interface HotelOption {
  name?: string;
  address?: string;
  rating?: number;
  reviews?: number;
  /** Per-night price as returned by the provider. */
  price?: number;
  currency?: string;
  url?: string;
  raw: unknown;
}
export interface HotelsResponse extends Sourced {
  city: string;
  country?: string;
  checkin: string;
  checkout: string;
  nights: number;
  options: HotelOption[];
}

export interface TrafficIncident {
  type?: string;
  message?: string;
  latitude?: number;
  longitude?: number;
  roads: string[];
  raw: unknown;
}
export interface ChangiResponse extends Sourced {
  from?: string;
  flight_time: string;
  leave_by: string;
  base_lead_minutes: number;
  incident_buffer_minutes: number;
  route_roads: string[];
  incidents_on_route: TrafficIncident[];
  total_incidents: number;
  travel_times?: { source: string; raw: unknown } | null;
}

export interface FxResponse extends Sourced {
  from: string;
  to: string;
  amount: number;
  rate?: number;
  converted?: number;
}

export interface SgWeatherResponse extends Sourced {
  area?: string;
  forecast_2h?: unknown;
  forecast_24h?: unknown;
  rainfall?: unknown;
  sources: Record<string, string>;
}

export interface DailyForecast {
  date?: string;
  weekday?: string;
  min_temp?: number;
  max_temp?: number;
  precip_prob?: number;
  precip_mm?: number;
  humidity?: number;
}
export interface AbroadWeatherResponse extends Sourced {
  city: string;
  resolved_name?: string;
  summary?: string;
  temperature?: number;
  temperature_unit?: string;
  condition?: string;
  forecast?: DailyForecast[];
  best_time_summary?: string;
  attribution?: string;
  place_url?: string;
}

export interface DestinationResponse extends Sourced {
  city: string;
  handle?: string;
  name?: string;
  country?: string;
  airport_code?: string;
  currency_code?: string;
  currency_name?: string;
  phone_code?: string;
  safety_level?: number;
  /** Markdown brief from the provider (safety, health, recent news). */
  brief?: string;
  brief_updated?: string;
  taxi_apps?: string[];
  place_url?: string;
  /** Optional extras when the toolbox has them (Pulse). */
  events?: { source: string; items: NamedItem[]; raw: unknown } | null;
  local_tips?: { source: string; items: NamedItem[]; raw: unknown } | null;
}

export interface NamedItem {
  name?: string;
  description?: string;
  date?: string;
  category?: string;
  raw: unknown;
}

export interface Attraction {
  name?: string;
  description?: string;
  rating?: number;
  reviews?: number;
  address?: string;
  url?: string;
  raw: unknown;
}
export interface AttractionsResponse extends Sourced {
  city: string;
  results: Attraction[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface ChatResponse {
  text: string;
  tools_used: string[];
  source: string;
  fetched_at: string;
}

export interface ApiErrorBody {
  error: string;
  source?: string;
  missing_capability?: string;
}
