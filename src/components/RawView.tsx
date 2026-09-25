export function RawView({ data, label = "Raw tool output" }: { data: unknown; label?: string }) {
  if (data === null || data === undefined) return null;
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <details className="raw">
      <summary>{label}</summary>
      <pre>{text.length > 20000 ? `${text.slice(0, 20000)}\n… (truncated)` : text}</pre>
    </details>
  );
}
