import { resolveTool, callTool } from './tools.js';

export interface FlightOption {
  id?: string;
  airline?: string;
  flightNumber?: string;
  price?: number;
  currency?: string;
  priceFormatted?: string;
  departure?: {
    airport?: string;
    city?: string;
    time?: string;
  };
  arrival?: {
    airport?: string;
    city?: string;
    time?: string;
  };
  duration?: string | number;
  stops?: number;
  deepLink?: string;
  raw?: unknown;
}

export interface FlightsResult {
  flights: FlightOption[];
  total_found?: number;
  from: string;
  to?: string;
  depart?: string;
  return?: string;
  source: string;
  fetched_at: string;
}

export async function getFlights(params: {
  from?: string;
  to?: string;
  depart?: string;
  returnDate?: string;
}): Promise<FlightsResult> {
  const matched = await resolveTool('flights');
  const origin = (params.from && params.from.trim()) || 'SIN';
  const destination = params.to?.trim() || '';
  const depart = params.depart?.trim() || '';
  const returnDate = params.returnDate?.trim() || '';

  // Build tool arguments by inspecting the matched tool schema
  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  // Map origin
  if ('origin' in schemaProps) args['origin'] = origin;
  else if ('fly_from' in schemaProps) args['fly_from'] = origin;
  else if ('from' in schemaProps) args['from'] = origin;
  else if ('flyFrom' in schemaProps) args['flyFrom'] = origin;
  else args['origin'] = origin;

  // Map destination
  if (destination) {
    if ('destination' in schemaProps) args['destination'] = destination;
    else if ('fly_to' in schemaProps) args['fly_to'] = destination;
    else if ('to' in schemaProps) args['to'] = destination;
    else if ('flyTo' in schemaProps) args['flyTo'] = destination;
    else args['destination'] = destination;
  }

  // Map departure date
  if (depart) {
    if ('departure_date' in schemaProps) args['departure_date'] = depart;
    else if ('date_from' in schemaProps) args['date_from'] = depart;
    else if ('depart' in schemaProps) args['depart'] = depart;
    else if ('departureDate' in schemaProps) args['departureDate'] = depart;
    else if ('date' in schemaProps) args['date'] = depart;
    else args['depart'] = depart;
  }

  // Map return date
  if (returnDate) {
    if ('return_date' in schemaProps) args['return_date'] = returnDate;
    else if ('return_from' in schemaProps) args['return_from'] = returnDate;
    else if ('return' in schemaProps) args['return'] = returnDate;
    else if ('returnDate' in schemaProps) args['returnDate'] = returnDate;
    else args['return'] = returnDate;
  }

  // Request SGD currency if supported
  if ('currency' in schemaProps) args['currency'] = 'SGD';
  else if ('curr' in schemaProps) args['curr'] = 'SGD';

  if ('limit' in schemaProps) args['limit'] = 20;

  const rawResult = await callTool(matched.name, args);

  // Normalize flight items from various response shapes
  let rawList: any[] = [];
  if (Array.isArray(rawResult)) {
    rawList = rawResult;
  } else if (Array.isArray(rawResult?.data)) {
    rawList = rawResult.data;
  } else if (Array.isArray(rawResult?.flights)) {
    rawList = rawResult.flights;
  } else if (Array.isArray(rawResult?.results)) {
    rawList = rawResult.results;
  } else if (Array.isArray(rawResult?.options)) {
    rawList = rawResult.options;
  } else if (rawResult && typeof rawResult === 'object') {
    // If it's a single flight or contains nested arrays
    for (const key of Object.keys(rawResult)) {
      if (Array.isArray(rawResult[key]) && rawResult[key].length > 0) {
        rawList = rawResult[key];
        break;
      }
    }
  }

  const flights: FlightOption[] = rawList.slice(0, 20).map((f: any, idx: number) => {
    const priceVal =
      typeof f?.price === 'number'
        ? f.price
        : typeof f?.price?.amount === 'number'
          ? f.price.amount
          : typeof f?.conversion?.SGD === 'number'
            ? f.conversion.SGD
            : Number(f?.price) || 0;

    const curr = f?.currency || f?.price?.currency || (f?.conversion?.SGD ? 'SGD' : 'SGD');
    const priceFormatted = curr === 'SGD' ? `S$ ${priceVal.toLocaleString()}` : `${curr} ${priceVal.toLocaleString()}`;

    return {
      id: f?.id || f?.flight_id || `flight-${idx + 1}`,
      airline: f?.airline || f?.airlines?.[0] || f?.carrier || f?.operating_carrier || 'Airline Partner',
      flightNumber: f?.flight_no || f?.flightNumber || f?.flight_number || (f?.airlines?.[0] ? `${f.airlines[0]}` : undefined),
      price: priceVal,
      currency: curr,
      priceFormatted,
      departure: {
        airport: f?.flyFrom || f?.departure_airport || f?.origin || origin,
        city: f?.cityFrom || f?.origin_city || origin,
        time: f?.local_departure || f?.departure_time || f?.departureTime || f?.dTime,
      },
      arrival: {
        airport: f?.flyTo || f?.arrival_airport || f?.destination || destination,
        city: f?.cityTo || f?.destination_city || destination,
        time: f?.local_arrival || f?.arrival_time || f?.arrivalTime || f?.aTime,
      },
      duration: f?.duration?.total || f?.flight_duration || f?.duration || undefined,
      stops: typeof f?.route?.length === 'number' ? Math.max(0, f.route.length - 1) : typeof f?.stops === 'number' ? f.stops : 0,
      deepLink: f?.deep_link || f?.booking_link || f?.url,
      raw: f,
    };
  });

  return {
    flights,
    total_found: rawList.length,
    from: origin,
    to: destination,
    depart,
    return: returnDate,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
