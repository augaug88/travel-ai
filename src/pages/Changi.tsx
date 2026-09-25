import { type FormEvent, useState } from "react";
import type { ChangiResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";
import { sgTime } from "../lib/format";

export default function ChangiPage() {
  const [from, setFrom] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const { data, loading, error, touched, run } = useAsync<ChangiResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => apiGet<ChangiResponse>("/api/changi", { from, flight_time: flightTime }));
  };

  return (
    <section>
      <h2>Getting to Changi</h2>
      <form className="form" onSubmit={submit}>
        <Field label="Leaving from (optional)" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Jurong East" />
        <Field label="Flight departure" type="datetime-local" value={flightTime} onChange={(e) => setFlightTime(e.target.value)} required />
        <button type="submit" disabled={loading}>Check traffic & leave-by time</button>
      </form>

      {loading && <Loading label="Checking LTA incidents…" />}
      {error && <ErrorBox error={error} />}
      {!touched && !loading && <Empty>Enter your flight time. Leave-by = departure − 3 h − 15 min per incident on ECP / PIE / TPE / KPE.</Empty>}
      {data && (
        <>
          <SourceLine source={data.source} fetchedAt={data.fetched_at} />
          <div className="hero">
            <div className="hero-label">Leave by</div>
            <div className="hero-value">{sgTime(data.leave_by)}</div>
            <div className="muted">
              Flight {sgTime(data.flight_time)} · {data.base_lead_minutes} min lead + {data.incident_buffer_minutes} min incident buffer
              {data.from ? ` · from ${data.from}` : ""}
            </div>
          </div>
          <h3>Incidents on {data.route_roads.join(" / ")} ({data.incidents_on_route.length} of {data.total_incidents} live)</h3>
          {data.incidents_on_route.length === 0 ? (
            <Empty>No live incidents reported on the expressways toward Changi.</Empty>
          ) : (
            <ul className="cards">
              {data.incidents_on_route.map((i, idx) => (
                <li key={idx} className="card">
                  <strong>{i.type ?? "Incident"} · {i.roads.join(", ")}</strong>
                  <div className="muted">{i.message ?? "(no message)"}</div>
                </li>
              ))}
            </ul>
          )}
          {data.travel_times && <RawView data={data.travel_times.raw} label={`Expressway travel times (${data.travel_times.source})`} />}
          <RawView data={data.raw} label="All incidents (raw)" />
        </>
      )}
    </section>
  );
}
