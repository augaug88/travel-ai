import type { Request, Response } from 'express';
import { getSingaporeWeather } from '../../lib/weather.js';
import { handleRouteError } from '../_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const area = (req.query.area as string) || 'Changi';
    const data = await getSingaporeWeather({ area });
    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'vdineshk/sg-weather-data-mcp');
  }
}
