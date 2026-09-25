import type { ResolvedTool } from "./capabilities.js";

/**
 * Build a tool's argument object from its runtime inputSchema.
 * We never assume a parameter name: each of our values carries a list of
 * aliases, and only schema properties whose (normalised) name matches an alias
 * are filled. A required property we cannot supply is a hard error.
 */
export interface ArgSpec {
  aliases: string[];
  value: unknown;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Schema {
  properties?: Record<string, { type?: string | string[]; enum?: unknown[] }>;
  required?: string[];
}

function coerce(value: unknown, type: string | string[] | undefined): unknown {
  const t = Array.isArray(type) ? type[0] : type;
  if (value === undefined || value === null) return value;
  if (t === "number" || t === "integer") {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (t === "string" && typeof value !== "string") return String(value);
  return value;
}

export function buildArgs(tool: ResolvedTool, specs: ArgSpec[]): Record<string, unknown> {
  const schema = tool.inputSchema as Schema;
  const props = schema.properties ?? {};
  const args: Record<string, unknown> = {};
  const names = Object.keys(props);

  if (names.length === 0) {
    // No schema published: send our primary alias for each defined value.
    for (const s of specs) {
      if (s.value !== undefined && s.value !== null && s.value !== "") args[s.aliases[0]] = s.value;
    }
    return args;
  }

  for (const name of names) {
    const key = norm(name);
    const spec = specs.find((s) => s.aliases.some((a) => norm(a) === key));
    if (!spec) continue;
    if (spec.value === undefined || spec.value === null || spec.value === "") continue;
    args[name] = coerce(spec.value, props[name]?.type);
  }

  const missing = (schema.required ?? []).filter((r) => args[r] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `tool "${tool.name}" requires parameter(s) ${missing.map((m) => `"${m}"`).join(", ")} which this route cannot supply (known parameters: ${names.join(", ")})`,
    );
  }
  return args;
}
