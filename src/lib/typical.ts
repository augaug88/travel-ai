/**
 * "vs typical SG traveller" benchmarks. Intentionally empty: no averages are
 * hard-coded. When real data is available, populate this map keyed by
 * destination city (lower-case) with a per-trip S$ figure and a source label,
 * and the Plan screen will show the comparison automatically.
 */
export interface TypicalSpend {
  per_trip_sgd: number;
  source: string;
}

export const TYPICAL_SG_TRAVELLER: Record<string, TypicalSpend> | null = null;
