import { useState, useId } from 'react';
import { Plane, Search, ArrowRight, Clock, ShieldCheck, ExternalLink, Calendar, MapPin } from 'lucide-react';
import type { FlightItem } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const QUICK_AIRPORTS = [
  { city: 'Bangkok', code: 'BKK' },
  { city: 'Tokyo', code: 'NRT' },
  { city: 'Bali', code: 'DPS' },
  { city: 'Kuala Lumpur', code: 'KUL' },
  { city: 'Seoul', code: 'ICN' },
  { city: 'Taipei', code: 'TPE' },
  { city: 'London', code: 'LHR' },
];

export function FlightsView() {
  const fromInputId = useId();
  const toInputId = useId();
  const departInputId = useId();
  const returnInputId = useId();

  const [from, setFrom] = useState('SIN');
  const [to, setTo] = useState('BKK');
  const [depart, setDepart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 19);
    return d.toISOString().split('T')[0];
  });

  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; source?: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!to.trim()) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = `/api/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&depart=${encodeURIComponent(depart)}&return=${encodeURIComponent(returnDate)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || 'Failed to search flights',
          source: data.source || 'kiwi',
        });
        setFlights([]);
      } else {
        setFlights(data.flights || []);
        setSource(data.source || 'kiwi');
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error while fetching flights',
        source: 'kiwi',
      });
      setFlights([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Search Header */}
      <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">
              <Plane className="h-3.5 w-3.5" /> Direct & Connecting Flights
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Departing from Singapore Changi (SIN)
            </h1>
            <p className="mt-1 text-xs text-slate-300">Live flight availability and prices via Kiwi MCP search tool.</p>
          </div>
          {source && (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              Provider: {source}
            </span>
          )}
        </div>

        {/* Search Form */}
        <div className="mt-6 rounded-2xl bg-white p-4 sm:p-5 text-slate-900 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label htmlFor={fromInputId} className="block text-xs font-semibold text-slate-600 mb-1">From Airport</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-rose-500" />
                <input
                  id={fromInputId}
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-bold font-mono focus:border-rose-500 focus:outline-hidden"
                  placeholder="SIN"
                />
              </div>
            </div>

            <div>
              <label htmlFor={toInputId} className="block text-xs font-semibold text-slate-600 mb-1">To Destination (IATA / City)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={toInputId}
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold focus:border-rose-500 focus:outline-hidden"
                  placeholder="e.g. BKK, Tokyo, DPS"
                />
              </div>
            </div>

            <div>
              <label htmlFor={departInputId} className="block text-xs font-semibold text-slate-600 mb-1">Depart Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={departInputId}
                  type="date"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor={returnInputId} className="block text-xs font-semibold text-slate-600 mb-1">Return Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={returnInputId}
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium focus:border-rose-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Quick Destination Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Popular from SIN:</span>
              {QUICK_AIRPORTS.map((a) => (
                <button
                  key={a.code}
                  onClick={() => {
                    setTo(a.code);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    to === a.code ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {a.city} ({a.code})
                </button>
              ))}
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading || !to.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Searching Live Flights...' : 'Search Flights'}
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && <ErrorAlert error={error.message} source={error.source} onRetry={handleSearch} />}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            Querying Kiwi search-flight tool via Smithery MCP...
          </div>
          <LoadingSkeleton count={4} type="card" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && hasSearched && flights.length === 0 && (
        <EmptyState
          icon={Plane}
          title="No Flights Found"
          description={`No scheduled flights were returned from ${from} to ${to} for the selected dates. Try shifting dates or trying an alternate nearby airport.`}
          actionText="Search Again"
          onAction={handleSearch}
        />
      )}

      {!hasSearched && !isLoading && (
        <EmptyState
          icon={Plane}
          title="Ready to Search Flights from Singapore"
          description="Find options departing from Changi Airport with real-time fares in Singapore Dollars (S$)."
          suggestions={['Bangkok (BKK)', 'Tokyo (NRT)', 'Bali (DPS)', 'Seoul (ICN)']}
          onSelectSuggestion={(s) => {
            const code = s.match(/\((.*?)\)/)?.[1] || s;
            setTo(code);
          }}
          actionText="Search Now"
          onAction={handleSearch}
        />
      )}

      {/* Flight Results */}
      {!isLoading && flights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Found {flights.length} flight options (showing up to 20)</span>
            <span>All fares displayed in S$</span>
          </div>

          <div className="grid gap-3">
            {flights.map((f, idx) => (
              <div
                key={f.id || idx}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Airline & Routing */}
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
                      <Plane className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{f.airline}</span>
                        {f.flightNumber && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                            {f.flightNumber}
                          </span>
                        )}
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                          {f.stops === 0 ? 'Direct' : `${f.stops} Stop${(f.stops || 1) > 1 ? 's' : ''}`}
                        </span>
                      </div>

                      {/* Times */}
                      <div className="mt-2 flex items-center gap-3 text-sm text-slate-700 font-medium">
                        <div>
                          <span className="font-bold text-slate-900">{f.departure?.airport || from}</span>
                          {f.departure?.time && <span className="ml-1 text-xs text-slate-500 font-normal">({f.departure.time})</span>}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        <div>
                          <span className="font-bold text-slate-900">{f.arrival?.airport || to}</span>
                          {f.arrival?.time && <span className="ml-1 text-xs text-slate-500 font-normal">({f.arrival.time})</span>}
                        </div>
                      </div>

                      {f.duration && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3 w-3" />
                          <span>Duration: {typeof f.duration === 'number' ? `${Math.round(f.duration / 60)}h ${f.duration % 60}m` : String(f.duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">Fare per pax</span>
                      <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">
                        {f.priceFormatted || (f.price ? `S$ ${f.price}` : 'Check Fare')}
                      </span>
                    </div>

                    {f.deepLink && (
                      <a
                        href={f.deepLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                      >
                        View Deal <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
