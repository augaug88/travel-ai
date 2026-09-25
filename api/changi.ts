import type { Request, Response } from 'express';
import { getChangiStatus } from '../lib/changi.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const from = (req.query.from as string) || '';
    const flightTime = (req.query.flight_time as string) || (req.query.flightTime as string) || '';

    const data = await getChangiStatus({
      from,
      flight_time: flightTime,
    });

    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'hithereiamaliff/mcp-ltadatamallsg');
  }
}
