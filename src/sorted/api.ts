export class ApiError extends Error {
  source?: string;
  constructor(message: string, source?: string) {
    super(message);
    this.source = source;
  }
}

export async function getJson<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const url = qs.toString() ? `${path}?${qs}` : path;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError('Network error: could not reach the server', 'sorted.travel');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || `Request failed (HTTP ${res.status})`, json.source || 'sorted.travel');
  return json as T;
}
