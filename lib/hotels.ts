import { buildArgs } from "./args.js";
import { CAP, resolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { findList, pickNumber, pickPrice, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { HotelOption, HotelsResponse } from "./types.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function searchHotels(params: { city: string; country?: string; checkin: string; checkout: string }): Promise<HotelsResponse> {
  const country = params.country?.toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) throw new BadRequestError("country must be an ISO 3166-1 alpha-2 code, e.g. JP");
  if (!DATE.test(params.checkin) || !DATE.test(params.checkout)) throw new BadRequestError("checkin/checkout must be YYYY-MM-DD");
  const nights = Math.round((Date.parse(params.checkout) - Date.parse(params.checkin)) / 86_400_000);
  if (!(nights > 0)) throw new BadRequestError("checkout must be after checkin");

  const tool = await resolveTool(CAP.hotels);
  try {
    const args = buildArgs(tool, [
      { aliases: ["city", "cityName", "city_name", "location", "destination", "query", "q", "place", "where", "search_query", "searchQuery", "area"], value: params.city },
      { aliases: ["country", "countryCode", "country_code"], value: country },
      { aliases: ["occupancies", "rooms"], value: [{ adults: 2 }] },
      { aliases: ["checkin", "check_in", "checkIn", "check_in_date", "checkInDate", "checkin_date", "arrival_date", "start_date", "startDate", "from_date"], value: params.checkin },
      { aliases: ["checkout", "check_out", "checkOut", "check_out_date", "checkOutDate", "checkout_date", "departure_date", "end_date", "endDate", "to_date"], value: params.checkout },
      { aliases: ["currency", "curr"], value: "SGD" },
      { aliases: ["adults", "guests", "num_adults", "occupancy", "travellers", "travelers"], value: 2 },
      { aliases: ["limit", "max_results", "maxResults", "results", "count"], value: 20 },
    ]);
    const raw = await callTool(tool.name, args);
    const options = findList(raw).slice(0, 20).map(normalizeHotel);
    return { city: params.city, country, checkin: params.checkin, checkout: params.checkout, nights, options, source: tool.source, fetched_at: nowIso(), raw };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

function normalizeHotel(item: Record<string, unknown>): HotelOption {
  const price = pickPrice(item);
  return {
    name: pickString(item, ["name", "hotel_name", "hotelName", "title", "property_name"]),
    address: pickString(item, ["address", "location", "neighborhood", "neighbourhood", "area", "vicinity"]),
    rating: pickNumber(item, ["rating", "overall_rating", "review_score", "score", "stars", "hotel_class"]),
    reviews: pickNumber(item, ["reviewCount", "review_count", "reviews", "num_reviews"]),
    price: price.amount,
    currency: price.currency,
    url: pickString(item, ["bookingUrl", "booking_url", "url", "link", "website", "galleryUrl"]),
    raw: item,
  };
}
