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
  price?: number;
  currency?: string;
  url?: string;
  raw: unknown;
}
export interface HotelsResponse extends Sourced {
  city: string;
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

export interface AbroadWeatherResponse extends Sourced {
  city: string;
  summary?: string;
  temperature?: number;
  temperature_unit?: string;
  condition?: string;
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
