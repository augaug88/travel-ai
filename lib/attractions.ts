import { buildArgs } from "./args.js";
import { CAP, resolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { collectUnderKey, findList, pickNumber, pickString } from "./normalize.js";
import { callTool } from "./tools.js";
import type { Attraction, AttractionsResponse } from "./types.js";

export async function searchAttractions(params: { city: string }): Promise<AttractionsResponse> {
  if (!params.city.trim()) throw new BadRequestError("city is required");
  const tool = await resolveTool(CAP.attractions);
  try {
    const props = (tool.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
    const isSkeleton = "destinations" in props && "start_date" in props;
    const start = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const end = new Date(Date.now() + 33 * 86_400_000).toISOString().slice(0, 10);
    const args = buildArgs(tool, [
      { aliases: ["destinations"], value: [params.city] },
      { aliases: ["start_date"], value: start },
      { aliases: ["end_date"], value: end },
      { aliases: ["vibes"], value: ["culture", "gourmet"] },
      { aliases: ["travelers"], value: 1 },
      { aliases: ["searchQuery", "search_query", "query", "q", "keyword", "text", "search", "location", "city", "place", "name"], value: isSkeleton ? undefined : `things to do in ${params.city}` },
      { aliases: ["category", "type"], value: "attractions" },
      { aliases: ["language", "lang"], value: "en" },
      { aliases: ["limit", "max_results", "maxResults", "results", "count"], value: 20 },
    ]);
    const raw = await callTool(tool.name, args);
    const items = isSkeleton ? collectUnderKey(raw, "activities") : findList(raw);
    const seen = new Set<string>();
    const results = items
      .map(normalizeAttraction)
      .filter((a) => {
        const key = (a.name ?? "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
    return { city: params.city, results, source: tool.source, fetched_at: nowIso(), raw };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

function normalizeAttraction(item: Record<string, unknown>): Attraction {
  return {
    name: pickString(item, ["name", "title", "display_name", "location_name"]),
    description: pickString(item, ["description", "snippet", "summary", "notes", "category", "subcategory", "type"]),
    rating: pickNumber(item, ["rating", "score", "stars"]),
    reviews: pickNumber(item, ["num_reviews", "reviews", "review_count", "reviewCount"]),
    address: pickString(item, ["address", "address_string", "addressString", "address_obj", "location_string", "vicinity", "location", "neighborhood", "area"]),
    url: pickString(item, ["web_url", "url", "link", "website"]),
    raw: item,
  };
}
