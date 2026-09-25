import type { Request, Response } from 'express';
import { getExchangeRate } from '../lib/fx.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const from = (req.query.from as string) || 'SGD';
    const to = (req.query.to as string) || 'USD';
    const amount = (req.query.amount as string) || '1';

    const data = await getExchangeRate({
      from,
      to,
      amount,
    });

    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'stockvibes07/exchange-mcp');
  }
}
