import type { Request, Response } from 'express';
import { getHotels } from '../lib/hotels.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const city = (req.query.city as string) || '';
    const checkin = (req.query.checkin as string) || '';
    const checkout = (req.query.checkout as string) || '';

    const data = await getHotels({
      city,
      checkin,
      checkout,
    });

    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'google/hotels');
  }
}
