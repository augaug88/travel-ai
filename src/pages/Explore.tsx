import { type FormEvent, useState } from "react";
import type { AttractionsResponse, DestinationResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";

export default function ExplorePage() {
  const [city, setCity] = useState("");
  const { data, loading, error, touched, run } = useAsync<AttractionsResponse>();
  const dest = useAsync<DestinationResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void dest.run(() => apiGet<DestinationResponse>("/api/destination", { city }));
    void run(() => apiGet<AttractionsResponse>("/api/attractions", { city }));
  };

  return (
    <section>
      <h2>Explore</h2>
      <form className="form" onSubmit={submit}>
        <Field label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bangkok" required />
        <button type="submit" disabled={loading || dest.loading}>Explore destination</button>
      </form>

      <h3>Destination facts</h3>
      {dest.loading && <Loading label="Fetching destination facts…" />}
      {dest.error && <ErrorBox error={dest.error} />}
      {!dest.touched && !dest.loading && <Empty>Safety, currency, phone code, taxi apps and recent news for the destination.</Empty>}
      {dest.data && (
        <>
          <SourceLine source={dest.data.source} fetchedAt={dest.data.fetched_at} />
          <div className="card">
            <strong>{dest.data.name ?? dest.data.city}</strong>
            <div className="muted">
              {dest.data.airport_code ? `Airport ${dest.data.airport_code}` : ""}
              {dest.data.currency_code ? ` · Currency ${dest.data.currency_code}${dest.data.currency_name ? ` (${dest.data.currency_name})` : ""}` : ""}
              {dest.data.phone_code ? ` · +${dest.data.phone_code}` : ""}
              {dest.data.safety_level !== undefined ? ` · Safety level ${dest.data.safety_level}` : ""}
            </div>
            {dest.data.taxi_apps && dest.data.taxi_apps.length > 0 && <div className="muted">Taxi apps: {dest.data.taxi_apps.join(", ")}</div>}
            {dest.data.brief && <pre className="brief">{dest.data.brief}</pre>}
            {dest.data.brief_updated && <div className="muted">Brief updated {dest.data.brief_updated}</div>}
            {dest.data.place_url && <a href={dest.data.place_url} target="_blank" rel="noreferrer">Full page</a>}
          </div>
          {dest.data.events && (
            <>
              <h3>Events</h3>
              <SourceLine source={dest.data.events.source} fetchedAt={dest.data.fetched_at} />
              {dest.data.events.items.length === 0 ? (
                <Empty>No events returned for this city.</Empty>
              ) : (
                <ul className="cards">
                  {dest.data.events.items.map((ev, i) => (
                    <li key={i} className="card">
                      <strong>{ev.name ?? "Event"}</strong>
                      <div className="muted">{[ev.date, ev.category].filter(Boolean).join(" · ")}</div>
                      {ev.description && <div className="muted">{ev.description}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <RawView data={dest.data.events.raw} label="Events (raw)" />
            </>
          )}
          {dest.data.local_tips && (
            <>
              <h3>Local tips</h3>
              <SourceLine source={dest.data.local_tips.source} fetchedAt={dest.data.fetched_at} />
              {dest.data.local_tips.items.length === 0 ? (
                <RawView data={dest.data.local_tips.raw} label="Local tips" />
              ) : (
                <ul className="cards">
                  {dest.data.local_tips.items.map((t, i) => (
                    <li key={i} className="card">
                      <strong>{t.name ?? t.category ?? "Tip"}</strong>
                      {t.description && <div className="muted">{t.description}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <RawView data={dest.data.raw} />
        </>
      )}

      <h3>Things to do</h3>
      {loading && <Loading label="Searching attractions…" />}
      {error && <ErrorBox error={error} />}
      {!touched && !loading && <Empty>Top attractions and things to do at your destination.</Empty>}
      {data && (
        <>
          <SourceLine source={data.source} fetchedAt={data.fetched_at} />
          {data.results.length === 0 ? (
            <Empty>No structured results. See the raw output below.</Empty>
          ) : (
            <ul className="cards">
              {data.results.map((a, i) => (
                <li key={i} className="card">
                  <div className="card-head">
                    <strong>{a.name ?? "Unnamed"}</strong>
                    {a.rating !== undefined && <span className="price">★ {a.rating}{a.reviews !== undefined ? ` (${a.reviews})` : ""}</span>}
                  </div>
                  {a.description && <div className="muted">{a.description}</div>}
                  {a.address && <div className="muted">{a.address}</div>}
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer">Open</a>}
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
