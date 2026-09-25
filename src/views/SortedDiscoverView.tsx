import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plane, Search, MapPin, ChevronRight, Sparkles, ImageOff } from 'lucide-react';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { SectionLabel, SourceNote } from '../sorted/SortedShell';
import { getJson, ApiError } from '../sorted/api';
import { useStore } from '../sorted/store';
import type { RecommendResult, ResolveResult, SortedPlace } from '../sorted/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BUDGETS = ['', 'low', 'medium', 'high'];
const TAGS = ['beach', 'city', 'food', 'culture', 'hiking', 'nature', 'wildlife', 'nightlife'];

type Err = { message: string; source?: string } | null;
const toErr = (e: unknown): Err => ({
  message: e instanceof Error ? e.message : String(e),
  source: e instanceof ApiError ? e.source : 'sorted.travel',
});

export function SortedDiscoverView() {
  const { homeAirport } = useStore();
  const [airport, setAirport] = useState(homeAirport || 'SIN');
  const [airportMatches, setAirportMatches] = useState<SortedPlace[]>([]);
  const [month, setMonth] = useState(((new Date().getMonth() + 1) % 12) + 1);
  const [budget, setBudget] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Err>(null);

  const [query, setQuery] = useState('');
  const [lookup, setLookup] = useState<ResolveResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<Err>(null);

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const findPlaces = async (from = airport) => {
    setError(null);
    setAirportMatches([]);
    let code = from.trim().toUpperCase();
    setLoading(true);
    try {
      // Anything that is not already a 3-letter code is resolved to an airport first.
      if (!/^[A-Z]{3}$/.test(code)) {
        const r = await getJson<ResolveResult>('/api/sorted/resolve', { q: from });
        const withAirport = r.matches.filter((m) => m.airport_code);
        if (withAirport.length === 1) {
          code = String(withAirport[0].airport_code).toUpperCase();
          setAirport(code);
        } else {
          setAirportMatches(withAirport);
          setResult(null);
          if (!withAirport.length) setError({ message: `No airport found for "${from}"`, source: 'sorted.travel' });
          return;
        }
      }
      const data = await getJson<RecommendResult>('/api/sorted/recommend', {
        from: code,
        month,
        budget: budget || undefined,
        tags: tags.length ? tags.join(',') : undefined,
      });
      setResult(data);
    } catch (e) {
      setError(toErr(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const lookUpPlace = async () => {
    if (!query.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    try {
      setLookup(await getJson<ResolveResult>('/api/sorted/resolve', { q: query }));
    } catch (e) {
      setLookupError(toErr(e));
      setLookup(null);
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="pt-2">
      {/* Where to go */}
      <section className="rounded-3xl bg-kanso-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kanso-accent">Where to go</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Ranked for your dates</h2>

        <label className="mt-5 block text-xs font-medium text-kanso-muted" htmlFor="sorted-from">
          Flying from
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-2xl bg-white px-4 py-3">
          <Plane className="h-4 w-4 text-kanso-muted" />
          <input
            id="sorted-from"
            value={airport}
            onChange={(e) => setAirport(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && findPlaces()}
            placeholder="SIN, or a city like Singapore"
            className="w-full bg-transparent text-base outline-none placeholder:text-kanso-muted/60"
          />
        </div>
        {airportMatches.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {airportMatches.map((m) => (
              <button
                key={`${m.airport_code}-${m.name}`}
                onClick={() => {
                  const code = String(m.airport_code).toUpperCase();
                  setAirport(code);
                  findPlaces(code);
                }}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium hover:bg-kanso-ink hover:text-white"
              >
                {m.airport_code} · {m.name}
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs font-medium text-kanso-muted">Month</p>
        <div className="mt-1.5 grid grid-cols-6 gap-1.5">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setMonth(i + 1)}
              className={`rounded-xl py-2 text-sm transition ${
                month === i + 1 ? 'bg-kanso-ink font-semibold text-white' : 'bg-white text-kanso-ink hover:bg-kanso-line'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-kanso-muted">Budget</p>
        <div className="mt-1.5 flex gap-1.5">
          {BUDGETS.map((b) => (
            <button
              key={b || 'any'}
              onClick={() => setBudget(b)}
              className={`flex-1 rounded-xl py-2 text-sm capitalize transition ${
                budget === b ? 'bg-kanso-ink font-semibold text-white' : 'bg-white hover:bg-kanso-line'
              }`}
            >
              {b || 'Any'}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs font-medium text-kanso-muted">Interests (optional)</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition ${
                tags.includes(t) ? 'bg-kanso-accent-soft font-medium text-kanso-accent' : 'bg-white hover:bg-kanso-line'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={() => findPlaces()}
          disabled={loading || !airport.trim()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-kanso-ink py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" /> {loading ? 'Finding places…' : 'Find places'}
        </button>
      </section>

      {error && (
        <div className="mt-4">
          <ErrorAlert error={error.message} source={error.source} onRetry={() => findPlaces()} />
        </div>
      )}
      {loading && (
        <div className="mt-6">
          <LoadingSkeleton count={4} type="list" />
        </div>
      )}

      {result && !loading && (
        <>
          <SectionLabel right={`${result.destinations.length} places`}>From {result.from} in {MONTHS[month - 1]}</SectionLabel>
          {result.destinations.length === 0 ? (
            <EmptyState icon={MapPin} title="No places matched" description="Try another month, or remove a filter." />
          ) : (
            <div className="space-y-3">
              {result.destinations.map((p, i) => (
                <PlaceRow key={p.handle || `${p.name}-${i}`} place={p} rank={i + 1} />
              ))}
            </div>
          )}
          <SourceNote fetchedAt={result.fetched_at} />
        </>
      )}

      {/* Look up a named place */}
      <SectionLabel>Look up a place</SectionLabel>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-kanso-card px-4 py-3">
          <Search className="h-4 w-4 text-kanso-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookUpPlace()}
            placeholder="Kyoto, Lisbon, Iceland…"
            className="w-full bg-transparent outline-none placeholder:text-kanso-muted/60"
          />
        </div>
        <button
          onClick={lookUpPlace}
          disabled={lookupLoading || !query.trim()}
          className="rounded-2xl bg-kanso-ink px-5 font-semibold text-white disabled:opacity-50"
        >
          {lookupLoading ? '…' : 'Go'}
        </button>
      </div>
      {lookupError && (
        <div className="mt-3">
          <ErrorAlert error={lookupError.message} source={lookupError.source} onRetry={lookUpPlace} />
        </div>
      )}
      {lookup && (
        <div className="mt-3 space-y-3">
          {lookup.matches.length === 0 ? (
            <EmptyState icon={Search} title="Not in the Sorted catalog" description={`Nothing matched "${lookup.query}".`} />
          ) : (
            lookup.matches.map((p, i) => <PlaceRow key={p.handle || `${p.name}-${i}`} place={p} />)
          )}
        </div>
      )}
    </div>
  );
}

function PlaceRow({ place, rank }: { place: SortedPlace; rank?: number }) {
  const body = (
    <div className="flex items-center gap-4 rounded-3xl bg-kanso-card p-3 pr-4 transition hover:bg-kanso-line">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-kanso-line">
        {place.image ? (
          <img src={place.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-kanso-muted">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
        {rank && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 text-[11px] font-semibold">{rank}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold">{place.name}</p>
        <p className="truncate text-sm text-kanso-muted">
          {[place.country, place.airport_code, place.score !== undefined ? `Score ${place.score}` : undefined]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {place.reason && <p className="mt-1 line-clamp-2 text-sm text-kanso-ink/80">{place.reason}</p>}
      </div>
      {place.handle && <ChevronRight className="h-5 w-5 shrink-0 text-kanso-muted" />}
    </div>
  );
  return place.handle ? <Link to={`/sorted/${place.handle}`}>{body}</Link> : body;
}
