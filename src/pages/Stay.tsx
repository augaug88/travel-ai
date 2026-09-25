import { type FormEvent, useState } from "react";
import type { HotelsResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";
import { isoDate, money } from "../lib/format";

export default function StayPage() {
  const [city, setCity] = useState("");
  const [checkin, setCheckin] = useState(isoDate(30));
  const [checkout, setCheckout] = useState(isoDate(34));
  const { data, loading, error, touched, run } = useAsync<HotelsResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => apiGet<HotelsResponse>("/api/hotels", { city, checkin, checkout }));
  };

  return (
    <section>
      <h2>Stay</h2>
      <form className="form" onSubmit={submit}>
        <Field label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo" required />
        <div className="row">
          <Field label="Check-in" type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} required />
          <Field label="Check-out" type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>Search hotels</button>
      </form>

      {loading && <Loading label="Searching hotels…" />}
      {error && <ErrorBox error={error} />}
      {!touched && !loading && <Empty>Search a city and dates for live hotel prices.</Empty>}
      {data && (
        <>
          <SourceLine source={data.source} fetchedAt={data.fetched_at} />
          <p className="muted">{data.nights} night(s) in {data.city}</p>
          {data.options.length === 0 ? (
            <Empty>The tool returned no structured hotels. See the raw output below.</Empty>
          ) : (
            <ul className="cards">
              {data.options.map((h, i) => (
                <li key={i} className="card">
                  <div className="card-head">
                    <strong>{h.name ?? "Hotel n/a"}</strong>
                    <span className="price">{money(h.price, h.currency)}</span>
                  </div>
                  <div className="muted">
                    {h.rating !== undefined ? `★ ${h.rating}` : ""}
                    {h.address ? ` · ${h.address}` : ""}
                  </div>
                  {h.url && <a href={h.url} target="_blank" rel="noreferrer">View on provider</a>}
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
