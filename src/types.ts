export interface FlightItem {
  id?: string;
  airline?: string;
  flightNumber?: string;
  price?: number;
  currency?: string;
  priceFormatted?: string;
  departure?: {
    airport?: string;
    city?: string;
    time?: string;
  };
  arrival?: {
    airport?: string;
    city?: string;
    time?: string;
  };
  duration?: string | number;
  stops?: number;
  deepLink?: string;
}

export interface HotelItem {
  id?: string;
  name: string;
  rating?: number;
  reviewsCount?: number;
  price?: number | string;
  pricePerNight?: number | string;
  currency?: string;
  priceFormatted?: string;
  address?: string;
  amenities?: string[];
  thumbnail?: string;
  link?: string;
}

export interface TrafficIncident {
  id?: string;
  type?: string;
  message: string;
  expressway?: string;
  latitude?: number;
  longitude?: number;
}

export interface ChangiData {
  from?: string;
  flight_time: string;
  leave_by: string;
  leave_by_iso: string;
  standard_lead_hours: number;
  incident_count: number;
  incident_buffer_minutes: number;
  monitored_expressways: string[];
  affecting_incidents: TrafficIncident[];
  all_incidents_count: number;
  source: string;
  fetched_at: string;
}

export interface FxData {
  from: string;
  to: string;
  amount: number;
  rate: number;
  converted: number;
  formatted_from: string;
  formatted_converted: string;
  source: string;
  fetched_at: string;
}

export interface SgWeatherData {
  area?: string;
  forecast?: string;
  temperature?: number | string;
  humidity?: number | string;
  rainfall?: number | string;
  source: string;
  fetched_at: string;
}

export interface AbroadWeatherData {
  city: string;
  forecast?: string;
  temperature?: number | string;
  condition?: string;
  humidity?: number | string;
  wind?: string | number;
  source: string;
  fetched_at: string;
}

export interface AttractionItem {
  id?: string;
  name: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  address?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
}

export interface ChatMessage {
  role: 'user' | 'model' | 'assistant';
  content: string;
  tools_used?: string[];
}
