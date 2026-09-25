import { resolveTool, callTool } from './tools.js';

export interface HotelOption {
  id?: string;
  name: string;
  rating?: number;
  reviewsCount?: number;
  price?: number | string;
  pricePerNight?: number | string;
  currency?: string;
  priceFormatted?: string;
  address?: string;
  amenities?: string[];
  thumbnail?: string;
  link?: string;
  raw?: unknown;
}

export interface HotelsResult {
  hotels: HotelOption[];
  count: number;
  city?: string;
  checkin?: string;
  checkout?: string;
  source: string;
  fetched_at: string;
}

export async function getHotels(params: {
  city?: string;
  checkin?: string;
  checkout?: string;
}): Promise<HotelsResult> {
  const matched = await resolveTool('hotels');
  const city = params.city?.trim() || '';
  const checkin = params.checkin?.trim() || '';
  const checkout = params.checkout?.trim() || '';

  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  // Map city / query / location
  if (city) {
    if ('city' in schemaProps) args['city'] = city;
    else if ('query' in schemaProps) args['query'] = city;
    else if ('location' in schemaProps) args['location'] = city;
    else if ('destination' in schemaProps) args['destination'] = city;
    else args['city'] = city;
  }

  // Map checkin
  if (checkin) {
    if ('checkin' in schemaProps) args['checkin'] = checkin;
    else if ('check_in' in schemaProps) args['check_in'] = checkin;
    else if ('checkIn' in schemaProps) args['checkIn'] = checkin;
    else if ('startDate' in schemaProps) args['startDate'] = checkin;
    else args['checkin'] = checkin;
  }

  // Map checkout
  if (checkout) {
    if ('checkout' in schemaProps) args['checkout'] = checkout;
    else if ('check_out' in schemaProps) args['check_out'] = checkout;
    else if ('checkOut' in schemaProps) args['checkOut'] = checkout;
    else if ('endDate' in schemaProps) args['endDate'] = checkout;
    else args['checkout'] = checkout;
  }

  const rawResult = await callTool(matched.name, args);

  let rawList: any[] = [];
  if (Array.isArray(rawResult)) {
    rawList = rawResult;
  } else if (Array.isArray(rawResult?.hotels)) {
    rawList = rawResult.hotels;
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

  const hotels: HotelOption[] = rawList.map((h: any, idx: number) => {
    const name = h?.name || h?.title || h?.hotel_name || `Hotel ${idx + 1}`;
    const rating = typeof h?.rating === 'number' ? h.rating : typeof h?.rate === 'number' ? h.rate : undefined;
    const priceVal = h?.price || h?.rate_per_night || h?.price_per_night || h?.rate || undefined;
    const currency = h?.currency || 'SGD';

    return {
      id: h?.id || h?.hotel_id || `hotel-${idx + 1}`,
      name,
      rating,
      reviewsCount: h?.reviews || h?.reviews_count || h?.user_rating_count || undefined,
      price: priceVal,
      pricePerNight: h?.rate_per_night || h?.price_per_night || priceVal,
      currency,
      priceFormatted: typeof priceVal === 'number' ? (currency === 'SGD' ? `S$ ${priceVal}` : `${currency} ${priceVal}`) : priceVal ? String(priceVal) : undefined,
      address: h?.address || h?.location || h?.vicinity || undefined,
      amenities: Array.isArray(h?.amenities) ? h.amenities : undefined,
      thumbnail: h?.thumbnail || h?.image || h?.photo || undefined,
      link: h?.link || h?.url || h?.booking_url || undefined,
      raw: h,
    };
  });

  return {
    hotels,
    count: hotels.length,
    city,
    checkin,
    checkout,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
