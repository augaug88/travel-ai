import { type FormEvent, useState } from "react";
import type { FlightsResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";
import { isoDate, money } from "../lib/format";

export default function FlightsPage() {
  const [from, setFrom] = useState("SIN");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState(isoDate(30));
  const [ret, setRet] = useState("");
  const { data, loading, error, touched, run } = useAsync<FlightsResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => apiGet<FlightsResponse>("/api/flights", { from, to, depart, return: ret }));
  };

  return (
    <section>
      <h2>Flights</h2>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <Field label="From (IATA)" value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} maxLength={3} required />
          <Field label="To (IATA)" value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} maxLength={3} placeholder="NRT" required />
        </div>
        <div className="row">
          <Field label="Depart" type="date" value={depart} onChange={(e) => setDepart(e.target.value)} required />
          <Field label="Return (optional)" type="date" value={ret} onChange={(e) => setRet(e.target.value)} />
        </div>
        <button type="submit" disabled={loading}>Search flights</button>
      </form>

      {loading && <Loading label="Searching flights…" />}
      {error && <ErrorBox error={error} />}
      {!touched && !loading && <Empty>Enter a destination airport to search live fares from Singapore.</Empty>}
      {data && (
        <>
          <SourceLine source={data.source} fetchedAt={data.fetched_at} />
          {data.options.length === 0 ? (
            <Empty>The tool returned no structured flight options. See the raw output below.</Empty>
          ) : (
            <ul className="cards">
              {data.options.map((o, i) => (
                <li key={i} className="card">
                  <div className="card-head">
                    <strong>{o.airline ?? "Airline n/a"}{o.flight_number ? ` · ${o.flight_number}` : ""}</strong>
                    <span className="price">{money(o.price, o.currency)}</span>
                  </div>
                  <div className="muted">
                    {(o.from ?? data.from)} → {(o.to ?? data.to)}
                    {o.departure ? ` · dep ${o.departure}` : ""}
                    {o.arrival ? ` · arr ${o.arrival}` : ""}
                  </div>
                  <div className="muted">
                    {o.duration ? `${o.duration}` : ""}
                    {o.stops !== undefined ? ` · ${o.stops === 0 ? "non-stop" : `${o.stops} stop(s)`}` : ""}
                  </div>
                  {o.booking_url && (
                    <a href={o.booking_url} target="_blank" rel="noreferrer">View on provider</a>
                  )}
                </li>
              ))}
            </ul>
          )}
          <RawView data={data.raw} />
        </>
      )}
    </section>
  );
}
