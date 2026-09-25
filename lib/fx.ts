import { resolveTool, callTool } from './tools.js';

export interface FxResult {
  from: string;
  to: string;
  amount: number;
  rate: number;
  converted: number;
  formatted_from: string;
  formatted_converted: string;
  raw?: unknown;
  source: string;
  fetched_at: string;
}

export async function getExchangeRate(params: {
  from?: string;
  to?: string;
  amount?: number | string;
}): Promise<FxResult> {
  const matched = await resolveTool('fx');
  const baseCurrency = (params.from?.trim() || 'SGD').toUpperCase();
  const targetCurrency = (params.to?.trim() || 'USD').toUpperCase();
  const amountNum = typeof params.amount === 'number' ? params.amount : parseFloat(String(params.amount || '1')) || 1;

  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  if ('from' in schemaProps) args['from'] = baseCurrency;
  else if ('base' in schemaProps) args['base'] = baseCurrency;
  else if ('source' in schemaProps) args['source'] = baseCurrency;
  else args['from'] = baseCurrency;

  if ('to' in schemaProps) args['to'] = targetCurrency;
  else if ('symbol' in schemaProps) args['symbol'] = targetCurrency;
  else if ('target' in schemaProps) args['target'] = targetCurrency;
  else if ('symbols' in schemaProps) args['symbols'] = targetCurrency;
  else args['to'] = targetCurrency;

  if ('amount' in schemaProps) args['amount'] = amountNum;

  const rawResult = await callTool(matched.name, args);

  // Parse exchange rate from various possible response formats
  let rate = 1;

  if (typeof rawResult === 'number') {
    rate = rawResult;
  } else if (typeof rawResult?.rate === 'number') {
    rate = rawResult.rate;
  } else if (typeof rawResult?.rates?.[targetCurrency] === 'number') {
    rate = rawResult.rates[targetCurrency];
  } else if (typeof rawResult?.conversion_rate === 'number') {
    rate = rawResult.conversion_rate;
  } else if (typeof rawResult?.result === 'number') {
    rate = amountNum > 0 ? rawResult.result / amountNum : rawResult.result;
  } else if (typeof rawResult?.price === 'number') {
    rate = rawResult.price;
  } else if (rawResult && typeof rawResult === 'object') {
    for (const k of Object.keys(rawResult)) {
      if (k.toUpperCase() === targetCurrency && typeof rawResult[k] === 'number') {
        rate = rawResult[k];
        break;
      }
    }
  }

  const converted = Math.round(amountNum * rate * 100) / 100;
  const formattedFrom = baseCurrency === 'SGD' ? `S$ ${amountNum.toLocaleString()}` : `${baseCurrency} ${amountNum.toLocaleString()}`;
  const formattedConverted = `${targetCurrency} ${converted.toLocaleString()}`;

  return {
    from: baseCurrency,
    to: targetCurrency,
    amount: amountNum,
    rate,
    converted,
    formatted_from: formattedFrom,
    formatted_converted: formattedConverted,
    raw: rawResult,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
