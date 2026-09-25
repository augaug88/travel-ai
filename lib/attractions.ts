import { resolveTool, callTool } from './tools.js';

export interface AttractionItem {
  id?: string;
  name: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  address?: string;
  description?: string;
  thumbnail?: string;
  url?: string;
  raw?: unknown;
}

export interface AttractionsResult {
  attractions: AttractionItem[];
  city: string;
  count: number;
  source: string;
  fetched_at: string;
}

export async function getAttractions(params: { city?: string }): Promise<AttractionsResult> {
  const matched = await resolveTool('attractions');
  const city = params.city?.trim() || 'Tokyo';

  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  if ('city' in schemaProps) args['city'] = city;
  else if ('query' in schemaProps) args['query'] = city;
  else if ('location' in schemaProps) args['location'] = city;
  else if ('searchQuery' in schemaProps) args['searchQuery'] = city;
  else args['city'] = city;

  if ('limit' in schemaProps) args['limit'] = 20;

  const rawResult = await callTool(matched.name, args);

  let rawList: any[] = [];
  if (Array.isArray(rawResult)) {
    rawList = rawResult;
  } else if (Array.isArray(rawResult?.attractions)) {
    rawList = rawResult.attractions;
  } else if (Array.isArray(rawResult?.results)) {
    rawList = rawResult.results;
  } else if (Array.isArray(rawResult?.data)) {
    rawList = rawResult.data;
  } else if (rawResult && typeof rawResult === 'object') {
    for (const key of Object.keys(rawResult)) {
      if (Array.isArray(rawResult[key]) && rawResult[key].length > 0) {
        rawList = rawResult[key];
        break;
      }
    }
  }

  const attractions: AttractionItem[] = rawList.slice(0, 20).map((a: any, idx: number) => {
    return {
      id: a?.id || a?.location_id || `attr-${idx + 1}`,
      name: a?.name || a?.title || a?.caption || `Point of Interest ${idx + 1}`,
      category: a?.category?.name || a?.category || a?.subcategory?.[0]?.name || 'Attraction',
      rating: typeof a?.rating === 'number' ? a.rating : undefined,
      reviewsCount: typeof a?.num_reviews === 'number' ? a.num_reviews : typeof a?.reviews_count === 'number' ? a.reviews_count : undefined,
      address: a?.address_obj?.address_string || a?.address || a?.vicinity || undefined,
      description: a?.description || a?.snippet || undefined,
      thumbnail: a?.photo?.images?.medium?.url || a?.thumbnail || a?.image || undefined,
      url: a?.web_url || a?.url || undefined,
      raw: a,
    };
  });

  return {
    attractions,
    city,
    count: attractions.length,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
