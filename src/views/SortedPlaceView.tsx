import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, ShieldCheck, Wallet, Sun, Stamp, ExternalLink, CalendarPlus, ChevronDown, ArrowLeft, Info,
} from 'lucide-react';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { SourceNote } from '../sorted/SortedShell';
import { getJson, ApiError } from '../sorted/api';
import { actions, useStore, isoDate } from '../sorted/store';
import { deepFind, firstOf, text, list, temp, humanize, isObj, isUrl, present } from '../sorted/pick';
import { COUNTRIES } from '../../lib/countries';
import type { DestinationResult, VisaResult } from '../sorted/types';

type Err = { message: string; source?: string } | null;
const toErr = (e: unknown): Err => ({
  message: e instanceof Error ? e.message : String(e),
  source: e instanceof ApiError ? e.source : 'sorted.travel',
});

// Keys each card reads, so "More details" shows only what is left.
const K = {
  name: ['name', 'title', 'display_name'],
  country: ['country', 'country_name'],
  image: ['image', 'image_url', 'hero_image', 'photo', 'cover'],
  brief: ['brief', 'summary', 'overview', 'description', 'intro'],
  safety: ['safety', 'safety_info', 'safety_level', 'advisory', 'safety_summary'],
  currency: ['currency', 'currency_code', 'currency_name', 'money'],
  phone: ['phone_code', 'calling_code', 'dialing_code', 'country_calling_code', 'phone'],
  esim: ['esim', 'esims', 'esim_providers', 'esim_options'],
  taxi: ['taxi_apps', 'ride_hailing', 'rideshare', 'taxis', 'taxi'],
};
const USED = new Set(Object.values(K).flat().concat(['handle', 'place_url', 'source', 'fetched_at']));

export function SortedPlaceView() {
  const { handle = '' } = useParams();
  const [data, setData] = useState<DestinationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Err>(null);
  const [planning, setPlanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<DestinationResult>('/api/sorted/destination', { handle }));
    } catch (e) {
      setError(toErr(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="pt-2">
        <LoadingSkeleton count={4} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4 pt-2">
        <BackLink />
        <ErrorAlert error={error?.message || 'No data returned'} source={error?.source} onRetry={load} />
      </div>
    );
  }

  const info = data.info;
  const name = text(deepFind(info, K.name)) || handle;
  const country = text(deepFind(info, K.country));
  const imageRaw = deepFind(info, K.image);
  const image = isUrl(imageRaw) ? imageRaw : isUrl(firstOf(imageRaw, ['url', 'src'])) ? firstOf(imageRaw, ['url', 'src']) : undefined;
  const brief = text(deepFind(info, K.brief));
  const safety = deepFind(info, K.safety);
  const money = {
    Currency: text(deepFind(info, K.currency)),
    'Phone code': text(deepFind(info, K.phone)),
    eSIM: list(deepFind(info, K.esim)).join(', ') || undefined,
    'Taxi apps': list(deepFind(info, K.taxi)).join(', ') || undefined,
  };

  return (
    <div className="pt-2">
      <BackLink />

      {/* Hero */}
      <section className="mt-3 overflow-hidden rounded-3xl bg-kanso-card">
        {image && <img src={image} alt="" className="h-48 w-full object-cover" />}
        <div className="p-5">
          <div className="flex items-center gap-2 text-kanso-accent">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.14em]">{country || 'Destination'}</span>
          </div>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">{name}</h2>
          <button
            onClick={() => setPlanning(true)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-kanso-ink py-4 text-base font-semibold text-white active:scale-[0.99]"
          >
            <CalendarPlus className="h-5 w-5" /> Plan a trip here
          </button>
        </div>
      </section>

      <div className="mt-4 space-y-3">
        {brief && (
          <Card icon={Info} title="Brief">
            <p className="whitespace-pre-line text-[15px] leading-relaxed">{brief}</p>
          </Card>
        )}

        {present(safety) && (
          <Card icon={ShieldCheck} title="Safety">
            {isObj(safety) ? <Facts obj={safety} /> : <p className="text-[15px] leading-relaxed">{text(safety)}</p>}
          </Card>
        )}

        {Object.values(money).some(Boolean) && (
          <Card icon={Wallet} title="Money & phone">
            <dl className="space-y-2">
              {Object.entries(money).map(([k, v]) =>
                v ? (
                  <div key={k} className="flex justify-between gap-4 text-[15px]">
                    <dt className="text-kanso-muted">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ) : null
              )}
            </dl>
          </Card>
        )}

        <WeatherCard weather={data.weather} />
        <VisaCard handle={handle} country={country} />

        <MoreDetails info={info} />
      </div>

      <a
        href={data.place_url}
        target="_blank"
        rel="noreferrer"
        className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-kanso-card py-4 font-semibold hover:bg-kanso-line"
      >
        Open on sorted.travel <ExternalLink className="h-4 w-4" />
      </a>
      <SourceNote fetchedAt={data.fetched_at} extra={data.weather_credit} />

      {planning && <PlanSheet handle={handle} name={name} country={country} image={image} onClose={() => setPlanning(false)} />}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/sorted/explore" className="inline-flex items-center gap-1 text-sm text-kanso-muted hover:text-kanso-ink">
      <ArrowLeft className="h-4 w-4" /> Explore
    </Link>
  );
}

function Card({ icon: Icon, title, children, right }: { icon: typeof Info; title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-3xl bg-kanso-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Facts({ obj, skip }: { obj: Record<string, any>; skip?: Set<string> }) {
  const rows = Object.entries(obj).filter(([k, v]) => !skip?.has(k) && present(v));
  if (!rows.length) return null;
  return (
    <dl className="space-y-2">
      {rows.map(([k, v]) => {
        if (isObj(v)) {
          const inner = text(v);
          if (inner) return <Row key={k} k={k} v={inner} />;
          return (
            <div key={k} className="rounded-2xl bg-white/70 p-3">
              <p className="mb-2 text-sm font-semibold">{humanize(k)}</p>
              <Facts obj={v} />
            </div>
          );
        }
        const value = Array.isArray(v) ? list(v).slice(0, 12).join(', ') : text(v);
        return value ? <Row key={k} k={k} v={value} /> : null;
      })}
    </dl>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-[15px]">
      <dt className="shrink-0 text-kanso-muted">{humanize(k)}</dt>
      <dd className="text-right">{isUrl(v) ? <a className="underline" href={v} target="_blank" rel="noreferrer">Link</a> : v}</dd>
    </div>
  );
}

function MoreDetails({ info }: { info: any }) {
  const [open, setOpen] = useState(false);
  if (!isObj(info)) return null;
  const rest = Object.fromEntries(Object.entries(info).filter(([k, v]) => !USED.has(k) && present(v)));
  if (!Object.keys(rest).length) return null;
  return (
    <section className="rounded-3xl bg-kanso-card p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-lg font-semibold">
        More details
        <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3">
          <Facts obj={rest} />
        </div>
      )}
    </section>
  );
}

// ---------- Weather ----------

function WeatherCard({ weather }: { weather: any }) {
  const current = deepFind(weather, ['current', 'now', 'current_weather', 'currently', 'today']);
  const currentTemp = temp(firstOf(current, ['temperature', 'temp', 'temp_c', 'temperature_c', 'air_temperature']) ?? deepFind(weather, ['temperature', 'temp_c']));
  const condition = text(firstOf(current, ['condition', 'summary', 'description', 'symbol', 'text', 'weather']));
  const forecastRaw = deepFind(weather, ['forecast', 'daily', 'seven_day', 'next_7_days', 'forecast_7d', 'days']);
  const forecast: any[] = Array.isArray(forecastRaw) ? forecastRaw.slice(0, 7) : [];
  const best = list(deepFind(weather, ['best_months', 'best_months_to_visit', 'best_time_to_visit', 'best_time']));
  const climateRaw = deepFind(weather, ['climate', 'monthly', 'monthly_climate', 'climate_by_month']);
  const climate: any[] = Array.isArray(climateRaw) ? climateRaw.slice(0, 12) : [];

  if (!currentTemp && !condition && !forecast.length && !best.length && !climate.length) {
    if (!isObj(weather)) return null;
    return (
      <Card icon={Sun} title="Weather">
        <Facts obj={weather} />
        <p className="mt-3 text-xs text-kanso-muted">Forecast by Foreca</p>
      </Card>
    );
  }

  return (
    <Card
      icon={Sun}
      title="Weather"
      right={currentTemp && <span className="rounded-full bg-white px-3 py-1 text-sm font-medium">{currentTemp}</span>}
    >
      {condition && <p className="text-[15px]">Now: {condition}</p>}

      {forecast.length > 0 && (
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
          {forecast.map((d, i) => {
            const date = text(firstOf(d, ['date', 'day', 'time', 'weekday']));
            const label = date && !Number.isNaN(Date.parse(date))
              ? new Date(date).toLocaleDateString('en-GB', { weekday: 'short' })
              : date || `D${i + 1}`;
            const hi = temp(firstOf(d, ['max', 'high', 'temp_max', 'max_temp', 'tmax', 'temperature_max', 'max_temperature']));
            const lo = temp(firstOf(d, ['min', 'low', 'temp_min', 'min_temp', 'tmin', 'temperature_min', 'min_temperature']));
            const cond = text(firstOf(d, ['condition', 'summary', 'symbol', 'description', 'text']));
            return (
              <div key={i} className="min-w-[4.5rem] rounded-2xl bg-white px-3 py-2 text-center">
                <p className="text-xs text-kanso-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold">{hi ?? '–'}</p>
                {lo && <p className="text-xs text-kanso-muted">{lo}</p>}
                {cond && <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-kanso-muted">{cond}</p>}
              </div>
            );
          })}
        </div>
      )}

      {best.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-kanso-muted">Best months</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {best.map((m) => (
              <span key={m} className="rounded-full bg-kanso-green-soft px-3 py-1 text-sm font-medium text-kanso-green">
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {climate.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-kanso-muted">Monthly climate</p>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {climate.map((c, i) => {
              const m = text(firstOf(c, ['month', 'name', 'label'])) ?? String(i + 1);
              const hi = temp(firstOf(c, ['high', 'max', 'avg_high', 'temp_max', 'avg_max', 'temperature']));
              const rain = text(firstOf(c, ['rain', 'rainfall', 'precipitation', 'rain_mm', 'rainy_days']));
              return (
                <div key={i} className="rounded-xl bg-white px-2 py-1.5 text-center">
                  <p className="text-[11px] text-kanso-muted">{m.length > 3 && !/^\d/.test(m) ? m.slice(0, 3) : m}</p>
                  <p className="text-sm font-medium">{hi ?? '–'}</p>
                  {rain && <p className="text-[10px] text-kanso-muted">{rain}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-kanso-muted">Forecast by Foreca</p>
    </Card>
  );
}

// ---------- Visa ----------

function VisaCard({ handle, country }: { handle: string; country?: string }) {
  const { passport } = useStore();
  const [code, setCode] = useState(passport || 'SG');
  const [data, setData] = useState<VisaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Err>(null);

  const check = async (c = code) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getJson<VisaResult>('/api/sorted/visa', { passport: c, destination: country || handle }));
    } catch (e) {
      setError(toErr(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const visa = data?.visa;
  const stance = text(deepFind(visa, ['requirement', 'visa_requirement', 'status', 'stance', 'visa', 'category', 'result', 'hassle']));
  const detail = text(deepFind(visa, ['summary', 'details', 'notes', 'description', 'text', 'message']));
  const stay = text(deepFind(visa, ['max_stay', 'allowed_stay', 'duration', 'days', 'stay']));

  return (
    <Card icon={Stamp} title="Visa">
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setData(null);
          }}
          aria-label="Passport country"
          className="flex-1 rounded-2xl bg-white px-4 py-3 text-[15px] outline-none"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} passport
            </option>
          ))}
        </select>
        <button
          onClick={() => check()}
          disabled={loading}
          className="rounded-2xl bg-kanso-ink px-5 font-semibold text-white disabled:opacity-50"
        >
          {loading ? '…' : 'Check'}
        </button>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorAlert error={error.message} source={error.source} onRetry={() => check()} />
        </div>
      )}

      {data && (
        <div className="mt-3 rounded-2xl bg-white p-4">
          {stance && <p className="text-lg font-semibold capitalize">{stance}</p>}
          {stay && <p className="text-sm text-kanso-muted">Stay: {stay}</p>}
          {detail && detail !== stance && <p className="mt-1 text-[15px]">{detail}</p>}
          {!stance && !detail && isObj(visa) && <Facts obj={visa} />}
          {!stance && !detail && !isObj(visa) && text(visa) && <p className="text-[15px]">{text(visa)}</p>}
        </div>
      )}
      <p className="mt-3 text-xs text-kanso-muted">Check with an official government source before you fly.</p>
    </Card>
  );
}

// ---------- Plan a trip ----------

function PlanSheet({
  handle, name, country, image, onClose,
}: { handle: string; name: string; country?: string; image?: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(isoDate(new Date()));
  const [days, setDays] = useState(5);

  const create = () => {
    actions.createTrip({ handle, name, country, image, startDate, days });
    navigate('/sorted/itinerary');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-kanso-bg p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-kanso-line" />
        <h3 className="text-xl font-semibold">Trip to {name}</h3>
        <label className="mt-4 block text-xs font-medium text-kanso-muted">
          First day
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 block w-full rounded-2xl bg-white px-4 py-3 text-base text-kanso-ink outline-none"
          />
        </label>
        <p className="mt-4 text-xs font-medium text-kanso-muted">Number of days</p>
        <div className="mt-1.5 flex items-center gap-3">
          <button onClick={() => setDays(Math.max(1, days - 1))} className="h-11 w-11 rounded-2xl bg-white text-xl">−</button>
          <span className="w-10 text-center text-xl font-semibold">{days}</span>
          <button onClick={() => setDays(Math.min(30, days + 1))} className="h-11 w-11 rounded-2xl bg-white text-xl">+</button>
        </div>
        <button
          onClick={create}
          disabled={!startDate}
          className="mt-6 w-full rounded-2xl bg-kanso-ink py-4 text-base font-semibold text-white disabled:opacity-50"
        >
          Create itinerary
        </button>
      </div>
    </div>
  );
}
