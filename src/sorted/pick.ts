// Helpers for reading Sorted Travel payloads without assuming one exact shape.

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const present = (v: unknown) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

export function firstOf(obj: unknown, keys: string[]): any {
  if (!isObj(obj)) return undefined;
  for (const k of keys) if (present(obj[k])) return obj[k];
  return undefined;
}

/** Breadth-first search through nested objects (not arrays) for the first key that has a value. */
export function deepFind(obj: unknown, keys: string[], depth = 3): any {
  let level: unknown[] = [obj];
  for (let d = 0; d <= depth && level.length; d++) {
    for (const o of level) {
      const hit = firstOf(o, keys);
      if (hit !== undefined) return hit;
    }
    level = level.flatMap((o) => (isObj(o) ? Object.values(o).filter(isObj) : []));
  }
  return undefined;
}

export function text(v: unknown): string | undefined {
  if (!present(v)) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    const parts = v.map((x) => text(x)).filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }
  if (isObj(v)) {
    const value = firstOf(v, ['value', 'amount', 'celsius', 'c']);
    if (value !== undefined) {
      const unit = firstOf(v, ['unit', 'units']);
      return unit ? `${value} ${unit}` : String(value);
    }
    const named = firstOf(v, ['name', 'label', 'title', 'summary', 'text', 'description', 'level', 'status', 'code']);
    if (named !== undefined) return text(named);
  }
  return undefined;
}

export function list(v: unknown): string[] {
  if (!present(v)) return [];
  if (Array.isArray(v)) return v.map((x) => text(x)).filter((x): x is string => !!x);
  const t = text(v);
  return t ? [t] : [];
}

export function temp(v: unknown): string | undefined {
  const t = text(v);
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? `${Math.round(n)}°C` : t;
}

export function humanize(key: string): string {
  const s = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//.test(v);
}

export { isObj, present };
