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

export interface Stamped {
  source: string;
  fetched_at: string;
}

export interface ResolveResult extends Stamped {
  query: string;
  matches: SortedPlace[];
}

export interface RecommendResult extends Stamped {
  from: string;
  destinations: SortedPlace[];
  discover_url: string;
}

export interface DestinationResult extends Stamped {
  handle: string;
  info: any;
  weather: any;
  weather_credit: string;
  place_url: string;
}

export interface VisaResult extends Stamped {
  passport: { code: string; name: string };
  destination: string;
  visa: any;
  note: string;
}

export type StopCategory = 'Cultural' | 'Leisure' | 'Dining' | 'Transport' | 'Other';
export type StopStatus = '' | 'Booked' | 'Confirmed' | 'Self-paced';

export interface Stop {
  id: string;
  day: number;
  time: string; // HH:MM, 24h
  durationMins: number;
  title: string;
  category: StopCategory;
  status: StopStatus;
  note?: string;
}

export interface Trip {
  id: string;
  handle: string;
  name: string;
  country?: string;
  image?: string;
  startDate: string; // YYYY-MM-DD
  days: number;
  stops: Stop[];
  createdAt: string;
}
