import type { Request, Response } from 'express';
import { handleChat } from '../lib/chat.js';
import { handleRouteError } from './_utils.js';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const messages = req.body?.messages || [];
    const data = await handleChat({ messages });
    return res.status(200).json(data);
  } catch (err) {
    return handleRouteError(res, err, 'gemini-2.5-flash');
  }
}
