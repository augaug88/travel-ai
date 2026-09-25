import type { Response } from 'express';
import { SortedError, SORTED_SOURCE } from '../lib/sorted.js';
import { handleRouteError } from './_utils.js';

// Bad input stays a 400; every upstream failure goes through the shared 502 handler.
export function sendSortedError(res: Response, err: unknown) {
  if (err instanceof SortedError && err.status === 400) {
    return res.status(400).json({ error: err.message, source: SORTED_SOURCE });
  }
  return handleRouteError(res, err, SORTED_SOURCE);
}
