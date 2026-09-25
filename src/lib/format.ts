/** S$ prefix for SGD; ISO code otherwise. Never invents a currency. */
export function money(amount: number | undefined, currency: string | undefined): string {
  if (amount === undefined || !Number.isFinite(amount)) return "—";
  const n = amount.toLocaleString("en-SG", { maximumFractionDigits: 2 });
  if (!currency) return n;
  if (currency.toUpperCase() === "SGD") return `S$${n}`;
  return `${currency.toUpperCase()} ${n}`;
}

export function isoDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

export function sgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
