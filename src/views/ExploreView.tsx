import { useState, useId } from 'react';
import { Compass, Search, Star, MapPin, ExternalLink, Bookmark } from 'lucide-react';
import type { AttractionItem } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const QUICK_CITIES = ['Tokyo', 'Bangkok', 'London', 'Bali', 'Seoul', 'Taipei'];

export function ExploreView() {
  const exploreCityInputId = useId();

  const [city, setCity] = useState('Tokyo');
  const [attractions, setAttractions] = useState<AttractionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; source?: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!city.trim()) return;
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const url = `/api/attractions?city=${encodeURIComponent(city)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || 'Failed to search attractions',
          source: data.source || 'tripadvisor/search',
        });
        setAttractions([]);
      } else {
        setAttractions(data.attractions || []);
        setSource(data.source || 'tripadvisor/search');
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error while fetching attractions',
        source: 'tripadvisor/search',
      });
      setAttractions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header Banner */}
      <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">
              <Compass className="h-3.5 w-3.5" /> Attractions & Things to Do
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Explore Destinations Abroad
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Top-rated sights and activities via TripAdvisor Search MCP tool (up to 20 results).
            </p>
          </div>
          {source && (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              Provider: {source}
            </span>
          )}
        </div>

        {/* Search Bar */}
        <div className="mt-6 rounded-2xl bg-white p-4 sm:p-5 text-slate-900 shadow-md">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label htmlFor={exploreCityInputId} className="sr-only">City</label>
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-rose-500" />
              <input
                id={exploreCityInputId}
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold focus:border-rose-500 focus:outline-hidden"
                placeholder="Enter city (e.g. Tokyo, Bangkok, London)..."
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isLoading || !city.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Searching...' : 'Explore City'}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-xs text-slate-400 font-medium mr-1">Popular for SG Travellers:</span>
            {QUICK_CITIES.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  city.toLowerCase() === c.toLowerCase() ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <ErrorAlert error={error.message} source={error.source} onRetry={handleSearch} />}

      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            Querying TripAdvisor attractions tool via Smithery MCP...
          </div>
          <LoadingSkeleton count={3} type="card" />
        </div>
      )}

      {!isLoading && !error && hasSearched && attractions.length === 0 && (
        <EmptyState
          icon={Compass}
          title="No Attractions Found"
          description={`No sights or activities were returned for ${city}. Try searching with another city name.`}
          actionText="Search Again"
          onAction={handleSearch}
        />
      )}

      {!hasSearched && !isLoading && (
        <EmptyState
          icon={Compass}
          title="Discover Things to Do"
          description="Explore iconic attractions, museums, landmarks and activities in your travel destination."
          suggestions={QUICK_CITIES}
          onSelectSuggestion={(c) => setCity(c)}
          actionText="Search Now"
          onAction={handleSearch}
        />
      )}

      {!isLoading && attractions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Showing {attractions.length} attractions in {city}</span>
            <span>Data from TripAdvisor</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attractions.map((a, idx) => (
              <div
                key={a.id || idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{a.name}</h3>
                    {a.rating && (
                      <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {a.rating}
                      </span>
                    )}
                  </div>

                  {a.category && (
                    <span className="mt-1 inline-block text-[11px] font-semibold text-rose-600">
                      {a.category}
                    </span>
                  )}

                  {a.address && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{a.address}</span>
                    </p>
                  )}

                  {a.description && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {a.reviewsCount ? `${a.reviewsCount.toLocaleString()} reviews` : 'Top sight'}
                  </span>

                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      View on TripAdvisor <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
