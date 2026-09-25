import { type FormEvent, useState } from "react";
import type { FlightsResponse, FxResponse, HotelsResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";
import { isoDate, money } from "../lib/format";
import { TYPICAL_SG_TRAVELLER } from "../lib/typical";

interface Line {
  label: string;
  amount?: number;
  currency?: string;
  note?: string;
}

function cheapest<T extends { price?: number; currency?: string }>(items: T[]): T | undefined {
  const priced = items.filter((i) => i.price !== undefined && i.price > 0);
  const sgd = priced.filter((i) => (i.currency ?? "").toUpperCase() === "SGD");
  const pool = sgd.length ? sgd : priced;
  return pool.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
}

export default function PlanPage() {
  const [city, setCity] = useState("");
  const [airport, setAirport] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [depart, setDepart] = useState(isoDate(30));
  const [nights, setNights] = useState("4");
  const [travellers, setTravellers] = useState("2");
  const [food, setFood] = useState("60");
  const [transport, setTransport] = useState("20");
  const [misc, setMisc] = useState("40");

  const flights = useAsync<FlightsResponse>();
  const hotels = useAsync<HotelsResponse>();
  const fx = useAsync<FxResponse>();

  const n = Math.max(1, Number(nights) || 1);
  const pax = Math.max(1, Number(travellers) || 1);
  const days = n + 1;
  const departMs = Date.parse(depart);
  const ret = Number.isNaN(departMs) ? isoDate(30 + n) : new Date(departMs + n * 86_400_000).toISOString().slice(0, 10);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    fx.reset();
    const [f, h] = await Promise.all([
      flights.run(() => apiGet<FlightsResponse>("/api/flights", { from: "SIN", to: airport, depart, return: ret })),
      hotels.run(() => apiGet<HotelsResponse>("/api/hotels", { city, country, checkin: depart, checkout: ret })),
    ]);
    const total = computeLines(f, h).sgdTotal;
    if (currency && currency.toUpperCase() !== "SGD" && total > 0) {
      void fx.run(() => apiGet<FxResponse>("/api/fx", { from: "SGD", to: currency, amount: total.toFixed(2) }));
    }
  };

  const computeLines = (f: FlightsResponse | null, h: HotelsResponse | null) => {
    const lines: Line[] = [];
    const cf = f ? cheapest(f.options) : undefined;
    lines.push(
      cf
        ? { label: `Flights (cheapest × ${pax})`, amount: (cf.price ?? 0) * pax, currency: cf.currency, note: cf.airline }
        : { label: "Flights", note: f ? "no priced option returned" : "not fetched" },
    );
    const ch = h ? cheapest(h.options) : undefined;
    lines.push(
      ch
        ? { label: `Hotel (cheapest per-night rate × ${n} nights)`, amount: (ch.price ?? 0) * n, currency: ch.currency, note: ch.name }
        : { label: "Hotel", note: h ? "no priced option returned" : "not fetched" },
    );
    lines.push({ label: `Food (S$${food}/day × ${days} d × ${pax})`, amount: (Number(food) || 0) * days * pax, currency: "SGD" });
    lines.push({ label: `Transport (S$${transport}/day × ${days} d × ${pax})`, amount: (Number(transport) || 0) * days * pax, currency: "SGD" });
    lines.push({ label: `Misc (S$${misc}/day × ${days} d × ${pax})`, amount: (Number(misc) || 0) * days * pax, currency: "SGD" });
    const sgdLines = lines.filter((l) => l.amount !== undefined && (l.currency ?? "").toUpperCase() === "SGD");
    const excluded = lines.filter((l) => l.amount !== undefined && (l.currency ?? "").toUpperCase() !== "SGD");
    const sgdTotal = sgdLines.reduce((s, l) => s + (l.amount ?? 0), 0);
    return { lines, sgdTotal, excluded };
  };

  const { lines, sgdTotal, excluded } = computeLines(flights.data, hotels.data);
  const busy = flights.loading || hotels.loading;
  const typical = TYPICAL_SG_TRAVELLER?.[city.trim().toLowerCase()];

  return (
    <section>
      <h2>Plan &amp; budget</h2>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <Field label="Destination city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo" required />
          <Field label="Airport (IATA)" value={airport} onChange={(e) => setAirport(e.target.value.toUpperCase())} maxLength={3} placeholder="NRT" required />
        </div>
        <div className="row">
          <Field label="Country (ISO-2)" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="JP" required />
          <Field label="Local currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="JPY" />
        </div>
        <Field label="Depart" type="date" value={depart} onChange={(e) => setDepart(e.target.value)} required />
        <div className="row">
          <Field label="Nights" type="number" min={1} value={nights} onChange={(e) => setNights(e.target.value)} required />
          <Field label="Travellers" type="number" min={1} value={travellers} onChange={(e) => setTravellers(e.target.value)} required />
        </div>
        <div className="row three">
          <Field label="Food S$/day" type="number" min={0} value={food} onChange={(e) => setFood(e.target.value)} />
          <Field label="Transport S$/day" type="number" min={0} value={transport} onChange={(e) => setTransport(e.target.value)} />
          <Field label="Misc S$/day" type="number" min={0} value={misc} onChange={(e) => setMisc(e.target.value)} />
        </div>
        <button type="submit" disabled={busy}>Build budget</button>
      </form>

      {busy && <Loading label="Fetching live flight and hotel prices…" />}
      {flights.error && <ErrorBox error={flights.error} />}
      {hotels.error && <ErrorBox error={hotels.error} />}

      <h3>Breakdown</h3>
      <table className="table">
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <td>
                {l.label}
                {l.note && <div className="muted">{l.note}</div>}
              </td>
              <td className="num">{money(l.amount, l.currency)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total (S$ lines only)</td>
            <td className="num">{money(sgdTotal, "SGD")}</td>
          </tr>
        </tbody>
      </table>
      {excluded.length > 0 && (
        <p className="muted">Not in the S$ total because the provider priced them in another currency: {excluded.map((l) => l.label).join("; ")}.</p>
      )}
      {flights.data && <SourceLine source={flights.data.source} fetchedAt={flights.data.fetched_at} />}
      {hotels.data && <SourceLine source={hotels.data.source} fetchedAt={hotels.data.fetched_at} />}

      {currency && currency.toUpperCase() !== "SGD" && (
        <>
          <h3>In {currency.toUpperCase()}</h3>
          {fx.loading && <Loading label="Fetching live rate…" />}
          {fx.error && <ErrorBox error={fx.error} />}
          {fx.data && (
            <div className="hero">
              <div className="hero-value">{money(fx.data.converted, fx.data.to)}</div>
              <div className="muted">{fx.data.rate !== undefined ? `1 SGD = ${fx.data.rate} ${fx.data.to}` : "rate not parsed"}</div>
              <SourceLine source={fx.data.source} fetchedAt={fx.data.fetched_at} />
            </div>
          )}
        </>
      )}

      {typical && (
        <p className="muted">
          vs typical SG traveller to {city}: {money(typical.per_trip_sgd, "SGD")} per trip ({typical.source}).
          {sgdTotal > 0 ? ` Your plan is ${sgdTotal > typical.per_trip_sgd ? "above" : "below"} that.` : ""}
        </p>
      )}
    </section>
  );
}
