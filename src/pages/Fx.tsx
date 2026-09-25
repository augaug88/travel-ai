import { type FormEvent, useState } from "react";
import type { FxResponse } from "../../lib/types";
import { Field } from "../components/Field";
import { RawView } from "../components/RawView";
import { Empty, ErrorBox, Loading, SourceLine } from "../components/Status";
import { apiGet, useAsync } from "../lib/api";
import { money } from "../lib/format";

export default function FxPage() {
  const [from, setFrom] = useState("SGD");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("100");
  const { data, loading, error, touched, run } = useAsync<FxResponse>();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => apiGet<FxResponse>("/api/fx", { from, to, amount }));
  };

  return (
    <section>
      <h2>Currency</h2>
      <form className="form" onSubmit={submit}>
        <div className="row">
          <Field label="From" value={from} onChange={(e) => setFrom(e.target.value.toUpperCase())} maxLength={3} required />
          <Field label="To" value={to} onChange={(e) => setTo(e.target.value.toUpperCase())} maxLength={3} placeholder="JPY" required />
        </div>
        <Field label="Amount" type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <button type="submit" disabled={loading}>Convert</button>
      </form>

      {loading && <Loading label="Fetching live rate…" />}
      {error && <ErrorBox error={error} />}
      {!touched && !loading && <Empty>Convert S$ to your destination currency at the live rate.</Empty>}
      {data && (
        <>
          <SourceLine source={data.source} fetchedAt={data.fetched_at} />
          <div className="hero">
            <div className="hero-label">{money(data.amount, data.from)} =</div>
            <div className="hero-value">{data.converted !== undefined ? money(data.converted, data.to) : "rate not parsed"}</div>
            <div className="muted">{data.rate !== undefined ? `1 ${data.from} = ${data.rate} ${data.to}` : "See raw output"}</div>
          </div>
          <RawView data={data.raw} />
        </>
      )}
    </section>
  );
}
