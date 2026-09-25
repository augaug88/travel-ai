import { useSyncExternalStore } from 'react';
import type { Stop, Trip } from './types';

// Trips live in this browser only (no database, no login).
const KEY = 'voyager.sorted.v1';

interface State {
  trips: Trip[];
  activeTripId?: string;
  passport?: string; // ISO alpha-2
  homeAirport?: string; // IATA
}

const EMPTY: State = { trips: [] };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private window, blocked): keep working in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function useActiveTrip(): Trip | undefined {
  const s = useStore();
  return s.trips.find((t) => t.id === s.activeTripId) ?? s.trips[0];
}

const newId = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  createTrip(input: Omit<Trip, 'id' | 'stops' | 'createdAt'>): Trip {
    const trip: Trip = { ...input, id: newId(), stops: [], createdAt: new Date().toISOString() };
    set({ ...state, trips: [trip, ...state.trips], activeTripId: trip.id });
    return trip;
  },
  setActive(id: string) {
    set({ ...state, activeTripId: id });
  },
  deleteTrip(id: string) {
    const trips = state.trips.filter((t) => t.id !== id);
    set({ ...state, trips, activeTripId: state.activeTripId === id ? trips[0]?.id : state.activeTripId });
  },
  saveStop(tripId: string, stop: Omit<Stop, 'id'> & { id?: string }) {
    set({
      ...state,
      trips: state.trips.map((t) => {
        if (t.id !== tripId) return t;
        const full: Stop = { ...stop, id: stop.id || newId() };
        const exists = t.stops.some((s) => s.id === full.id);
        return { ...t, stops: exists ? t.stops.map((s) => (s.id === full.id ? full : s)) : [...t.stops, full] };
      }),
    });
  },
  deleteStop(tripId: string, stopId: string) {
    set({
      ...state,
      trips: state.trips.map((t) => (t.id === tripId ? { ...t, stops: t.stops.filter((s) => s.id !== stopId) } : t)),
    });
  },
  setPassport(code: string) {
    set({ ...state, passport: code });
  },
  setHomeAirport(code: string) {
    set({ ...state, homeAirport: code.toUpperCase() });
  },
};

// ---------- Date helpers ----------

export function dayDate(trip: Trip, day: number): Date {
  const [y, m, d] = trip.startDate.split('-').map(Number);
  return new Date(y, m - 1, d + day - 1);
}

export function todayIndex(trip: Trip): number {
  const now = new Date();
  const start = dayDate(trip, 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86400000) + 1;
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function to12h(hhmm: string): { time: string; period: string } {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return { time: `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')}`, period };
}

export function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + mins) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
