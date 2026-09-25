import { MissingCapabilityError } from "./capabilities.js";
import { errorMessage } from "./mcp.js";

/** An upstream (Smithery server / Gemini) failure, tagged with its source. */
export class UpstreamError extends Error {
  constructor(
    public readonly source: string,
    message: string,
  ) {
    super(`${source}: ${message}`);
    this.name = "UpstreamError";
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

/** Wrap any failure from a lib function with its source; pass through known types. */
export function asUpstream(source: string, err: unknown): Error {
  if (err instanceof MissingCapabilityError || err instanceof UpstreamError || err instanceof BadRequestError) return err;
  return new UpstreamError(source, errorMessage(err));
}

export const nowIso = (): string => new Date().toISOString();
