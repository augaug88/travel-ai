import type { Request, Response } from 'express';
import { getRecommendedDestinations } from '../../lib/sorted.js';
import { sendSortedError } from '../_sorted.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const month = Number(req.query.month);
    const tags = String(req.query.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const data = await getRecommendedDestinations({
      from: String(req.query.from || ''),
      month: month >= 1 && month <= 12 ? month : undefined,
      budget: req.query.budget ? String(req.query.budget) : undefined,
      tags: tags.length ? tags : undefined,
    });
    return res.status(200).json(data);
  } catch (err) {
    return sendSortedError(res, err);
  }
}
