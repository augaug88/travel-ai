import type { Request, Response } from 'express';
import { getFlights } from '../lib/flights.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const from = (req.query.from as string) || 'SIN';
    const to = (req.query.to as string) || '';
    const depart = (req.query.depart as string) || '';
    const returnDate = (req.query.return as string) || (req.query.returnDate as string) || '';

    const data = await getFlights({
      from,
      to,
      depart,
      returnDate,
    });

    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'kiwi');
  }
}
