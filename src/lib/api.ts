import { useCallback, useState } from "react";
import type { ApiErrorBody } from "../../lib/types";

/** Browser-side API client. Talks only to this app's own /api routes. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly status: number,
    public readonly missingCapability?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const e = (body ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(e.error ?? (text || `HTTP ${res.status}`), e.source ?? "server", res.status, e.missing_capability);
  }
  return body as T;
}

export function apiGet<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  return fetch(`${path}?${qs.toString()}`).then((r) => handle<T>(r));
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => handle<T>(r));
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  /** true once a request has been made */
  touched: boolean;
}

/** Tiny request-state hook: run(fn) tracks loading/error/data. */
export function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: false, error: null, touched: false });
  const run = useCallback(async (fn: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null, touched: true });
    try {
      const data = await fn();
      setState({ data, loading: false, error: null, touched: true });
      return data;
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError(err instanceof Error ? err.message : String(err), "network", 0);
      setState({ data: null, loading: false, error: e, touched: true });
      return null;
    }
  }, []);
  const reset = useCallback(() => setState({ data: null, loading: false, error: null, touched: false }), []);
  return { ...state, run, reset };
}
