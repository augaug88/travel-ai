import type { ReactNode } from "react";
import type { ApiError } from "../lib/api";
import { timeAgo } from "../lib/format";

export function Loading({ label = "Fetching live data…" }: { label?: string }) {
  return (
    <div className="state loading" role="status">
      <span className="spinner" aria-hidden />
      {label}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="state empty">{children}</div>;
}

export function ErrorBox({ error }: { error: ApiError }) {
  return (
    <div className="state error" role="alert">
      <strong>{error.missingCapability ? "Capability missing in toolbox" : "Upstream failed"}</strong>
      <div className="error-source">source: {error.source}{error.status ? ` · HTTP ${error.status}` : ""}</div>
      <div className="error-msg">{error.message}</div>
    </div>
  );
}

export function SourceLine({ source, fetchedAt }: { source: string; fetchedAt: string }) {
  return (
    <div className="source-line">
      source: <code>{source}</code> · fetched {timeAgo(fetchedAt)}
    </div>
  );
}
