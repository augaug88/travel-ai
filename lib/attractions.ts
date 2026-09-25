import { buildArgs } from "./args.js";
import { CAP, resolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { findList, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { Attraction, AttractionsResponse } from "./types.js";

export async function searchAttractions(params: { city: string }): Promise<AttractionsResponse> {
  if (!params.city.trim()) throw new BadRequestError("city is required");
  const tool = await resolveTool(CAP.attractions);
  try {
    const args = buildArgs(tool, [
      { aliases: ["searchQuery", "search_query", "query", "q", "keyword", "text", "search", "location", "city", "place", "name"], value: `things to do in ${params.city}` },
      { aliases: ["category", "type"], value: "attractions" },
      { aliases: ["language", "lang"], value: "en" },
      { aliases: ["limit", "max_results", "maxResults", "results", "count"], value: 20 },
    ]);
    const raw = await callTool(tool.name, args);
    const results = findList(raw).slice(0, 20).map(normalizeAttraction);
    return { city: params.city, results, source: tool.source, fetched_at: nowIso(), raw };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

function normalizeAttraction(item: Record<string, unknown>): Attraction {
  return {
    name: pickString(item, ["name", "title", "display_name", "location_name"]),
    description: pickString(item, ["description", "snippet", "summary", "category", "subcategory"]),
    rating: pickNumber(item, ["rating", "score", "stars"]),
    reviews: pickNumber(item, ["num_reviews", "reviews", "review_count", "reviewCount"]),
    address: pickString(item, ["address", "address_string", "addressString", "address_obj", "location_string", "vicinity"]),
    url: pickString(item, ["web_url", "url", "link", "website"]),
    raw: item,
  };
}
