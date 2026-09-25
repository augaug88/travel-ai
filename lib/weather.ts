import { resolveTool, callTool } from './tools.js';

export interface SgWeatherResult {
  area?: string;
  forecast?: string;
  temperature?: number | string;
  humidity?: number | string;
  rainfall?: number | string;
  details?: unknown;
  raw?: unknown;
  source: string;
  fetched_at: string;
}

export interface AbroadWeatherResult {
  city: string;
  forecast?: string;
  temperature?: number | string;
  condition?: string;
  humidity?: number | string;
  wind?: string | number;
  details?: unknown;
  raw?: unknown;
  source: string;
  fetched_at: string;
}

export async function getSingaporeWeather(params: { area?: string }): Promise<SgWeatherResult> {
  const matched = await resolveTool('weather_sg');
  const area = params.area?.trim() || 'Changi';

  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  if ('area' in schemaProps) args['area'] = area;
  else if ('location' in schemaProps) args['location'] = area;
  else if ('town' in schemaProps) args['town'] = area;
  else args['area'] = area;

  const rawResult = await callTool(matched.name, args);

  // Extract forecast / temperature / etc.
  let forecast = 'Fair / Partly Cloudy';
  let temp: number | string | undefined;
  let humidity: number | string | undefined;

  if (typeof rawResult === 'string') {
    forecast = rawResult;
  } else if (rawResult && typeof rawResult === 'object') {
    forecast =
      rawResult.forecast ||
      rawResult.summary ||
      rawResult.weather ||
      rawResult.general?.forecast ||
      rawResult.items?.[0]?.forecasts?.[0]?.forecast ||
      forecast;
    temp = rawResult.temperature || rawResult.temp || rawResult.items?.[0]?.temperature;
    humidity = rawResult.humidity || rawResult.relative_humidity;
  }

  return {
    area,
    forecast,
    temperature: temp,
    humidity,
    details: rawResult,
    raw: rawResult,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}

export async function getAbroadWeather(params: { city?: string }): Promise<AbroadWeatherResult> {
  const matched = await resolveTool('weather_abroad');
  const city = params.city?.trim() || 'Tokyo';

  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  if ('city' in schemaProps) args['city'] = city;
  else if ('location' in schemaProps) args['location'] = city;
  else if ('q' in schemaProps) args['q'] = city;
  else args['city'] = city;

  const rawResult = await callTool(matched.name, args);

  let forecast = 'Clear / Sunny';
  let temp: number | string | undefined;
  let condition: string | undefined;
  let humidity: number | string | undefined;
  let wind: string | number | undefined;

  if (typeof rawResult === 'string') {
    forecast = rawResult;
  } else if (rawResult && typeof rawResult === 'object') {
    forecast = rawResult.forecast || rawResult.description || rawResult.summary || forecast;
    temp = rawResult.temperature || rawResult.temp || rawResult.current?.temp_c;
    condition = rawResult.condition || rawResult.weather || rawResult.current?.condition?.text;
    humidity = rawResult.humidity || rawResult.current?.humidity;
    wind = rawResult.wind || rawResult.wind_speed || rawResult.current?.wind_kph;
  }

  return {
    city,
    forecast,
    temperature: temp,
    condition,
    humidity,
    wind,
    details: rawResult,
    raw: rawResult,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
