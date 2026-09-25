import type { Response } from 'express';

export function handleRouteError(res: Response, err: unknown, defaultSource?: string) {
  const message = err instanceof Error ? err.message : String(err);
  const isMissingCapability = message.includes('Missing capability:');
  const status = isMissingCapability ? 502 : 502; // As specified, upstream tool failures or missing capabilities return 502

  return res.status(status).json({
    error: message,
    source: defaultSource,
  });
}
