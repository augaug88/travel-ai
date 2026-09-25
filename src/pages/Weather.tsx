import { type FormEvent, useState } from "react";
import type { AbroadWeatherResponse, SgWeatherResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";

export default function WeatherPage() {
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const sg = useAsync<SgWeatherResponse>();
  const abroad = useAsync<AbroadWeatherResponse>();

  const submitSg = (e: FormEvent) => {
    e.preventDefault();
    void sg.run(() => apiGet<SgWeatherResponse>("/api/weather/sg", { area }));
  };
  const submitAbroad = (e: FormEvent) => {
    e.preventDefault();
    void abroad.run(() => apiGet<AbroadWeatherResponse>("/api/weather/abroad", { city }));
  };

  return (
    <section>
      <h2>Weather</h2>

      <h3>Singapore (NEA)</h3>
      <form className="form" onSubmit={submitSg}>
        <Field label="Area (optional)" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Changi" />
        <button type="submit" disabled={sg.loading}>Get SG forecast</button>
      </form>
      {sg.loading && <Loading label="Fetching NEA forecast…" />}
      {sg.error && <ErrorBox error={sg.error} />}
      {!sg.touched && !sg.loading && <Empty>2-hour and 24-hour NEA forecasts, plus rainfall.</Empty>}
      {sg.data && (
        <>
          <SourceLine source={sg.data.source} fetchedAt={sg.data.fetched_at} />
          <RawView data={sg.data.forecast_2h} label={`2-hour forecast${sg.data.area ? ` · ${sg.data.area}` : ""}`} />
          <RawView data={sg.data.forecast_24h} label="24-hour forecast" />
          <RawView data={sg.data.rainfall} label="Rainfall" />
          {!sg.data.forecast_2h && !sg.data.forecast_24h && !sg.data.rainfall && <Empty>No forecast content returned.</Empty>}
        </>
      )}

      <h3>Destination</h3>
      <form className="form" onSubmit={submitAbroad}>
        <Field label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo" required />
        <button type="submit" disabled={abroad.loading}>Get city weather</button>
      </form>
      {abroad.loading && <Loading label="Fetching city weather…" />}
      {abroad.error && <ErrorBox error={abroad.error} />}
      {!abroad.touched && !abroad.loading && <Empty>Current conditions for a city abroad.</Empty>}
      {abroad.data && (
        <>
          <SourceLine source={abroad.data.source} fetchedAt={abroad.data.fetched_at} />
          <div className="hero">
            <div className="hero-label">{abroad.data.city}</div>
            <div className="hero-value">
              {abroad.data.temperature !== undefined ? `${abroad.data.temperature}${abroad.data.temperature_unit ?? ""}` : "—"}
            </div>
            <div className="muted">{abroad.data.condition ?? abroad.data.summary ?? "See raw output"}</div>
            {abroad.data.resolved_name && <div className="muted">Resolved to {abroad.data.resolved_name}</div>}
          </div>
          {abroad.data.forecast && (
            <table className="table">
              <tbody>
                {abroad.data.forecast.map((d, i) => (
                  <tr key={i}>
                    <td>{d.weekday ?? ""} {d.date ?? ""}</td>
                    <td className="num">{d.min_temp ?? "?"}–{d.max_temp ?? "?"}°C</td>
                    <td className="num">{d.precip_prob !== undefined ? `${d.precip_prob}% rain` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {abroad.data.best_time_summary && <p className="muted">{abroad.data.best_time_summary}</p>}
          {abroad.data.attribution && <p className="muted">{abroad.data.attribution}{abroad.data.place_url ? <> · <a href={abroad.data.place_url} target="_blank" rel="noreferrer">full page</a></> : null}</p>}
          <RawView data={abroad.data.raw} />
        </>
      )}
    </section>
  );
}
