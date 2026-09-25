import type { Request, Response } from 'express';
import { getAttractions } from '../lib/attractions.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const city = (req.query.city as string) || 'Tokyo';
    const data = await getAttractions({ city });
    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'tripadvisor/search');
  }
}
