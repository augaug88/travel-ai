import { type FormEvent, useState } from "react";
import type { AttractionsResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";

export default function ExplorePage() {
  const [city, setCity] = useState("");
  const { data, loading, error, touched, run } = useAsync<AttractionsResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => apiGet<AttractionsResponse>("/api/attractions", { city }));
  };

  return (
    <section>
      <h2>Explore</h2>
      <form className="form" onSubmit={submit}>
        <Field label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bangkok" required />
        <button type="submit" disabled={loading}>Find things to do</button>
      </form>

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
