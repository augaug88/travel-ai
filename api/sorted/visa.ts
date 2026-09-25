import type { Request, Response } from 'express';
import { checkVisaRequirements, SORTED_SOURCE } from '../../lib/sorted.js';
import { findCountry } from '../../lib/countries.js';
import { sendSortedError } from '../_sorted.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const passport = findCountry(String(req.query.passport || ''));
    if (!passport) {
      return res.status(400).json({ error: 'Unknown passport country', source: SORTED_SOURCE });
    }
    const data = await checkVisaRequirements(passport, String(req.query.destination || ''));
    return res.status(200).json(data);
  } catch (err) {
    return sendSortedError(res, err);
  }
}
