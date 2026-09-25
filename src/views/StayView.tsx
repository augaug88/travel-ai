import { useState, useId } from 'react';
import { Hotel, Search, Star, MapPin, Calendar, Check, ExternalLink } from 'lucide-react';
import type { HotelItem } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

const QUICK_CITIES = ['Tokyo', 'Bangkok', 'Kuala Lumpur', 'Bali', 'Seoul', 'London'];

export function StayView() {
  const cityInputId = useId();
  const checkinInputId = useId();
  const checkoutInputId = useId();

  const [city, setCity] = useState('Tokyo');
  const [checkin, setCheckin] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [checkout, setCheckout] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 19);
    return d.toISOString().split('T')[0];
  });

  const [hotels, setHotels] = useState<HotelItem[]>([]);
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
      const url = `/api/hotels?city=${encodeURIComponent(city)}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || 'Failed to search hotels',
          source: data.source || 'google/hotels',
        });
        setHotels([]);
      } else {
        setHotels(data.hotels || []);
        setSource(data.source || 'google/hotels');
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error while fetching hotels',
        source: 'google/hotels',
      });
      setHotels([]);
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
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              <Hotel className="h-3.5 w-3.5" /> Accommodations & Resorts
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hotels & Stays for SG Travellers
            </h1>
            <p className="mt-1 text-xs text-slate-300">Live search powered by Google Hotels via Smithery MCP.</p>
          </div>
          {source && (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              Provider: {source}
            </span>
          )}
        </div>

        {/* Search Controls */}
        <div className="mt-6 rounded-2xl bg-white p-4 sm:p-5 text-slate-900 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor={cityInputId} className="block text-xs font-semibold text-slate-600 mb-1">Destination City</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-indigo-500" />
                <input
                  id={cityInputId}
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-hidden"
                  placeholder="e.g. Tokyo, Bangkok, Paris"
                />
              </div>
            </div>

            <div>
              <label htmlFor={checkinInputId} className="block text-xs font-semibold text-slate-600 mb-1">Check-in Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={checkinInputId}
                  type="date"
                  value={checkin}
                  onChange={(e) => setCheckin(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label htmlFor={checkoutInputId} className="block text-xs font-semibold text-slate-600 mb-1">Check-out Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={checkoutInputId}
                  type="date"
                  value={checkout}
                  onChange={(e) => setCheckout(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium focus:border-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Popular:</span>
              {QUICK_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    city.toLowerCase() === c.toLowerCase() ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading || !city.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Searching Hotels...' : 'Search Stays'}
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert error={error.message} source={error.source} onRetry={handleSearch} />}

      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            Querying Google Hotels tool via Smithery MCP...
          </div>
          <LoadingSkeleton count={3} type="card" />
        </div>
      )}

      {!isLoading && !error && hasSearched && hotels.length === 0 && (
        <EmptyState
          icon={Hotel}
          title="No Hotels Found"
          description={`No accommodation results were returned for ${city}. Try searching with another city name or adjusting your stay dates.`}
          actionText="Search Again"
          onAction={handleSearch}
        />
      )}

      {!hasSearched && !isLoading && (
        <EmptyState
          icon={Hotel}
          title="Search Accommodations Abroad"
          description="Enter your destination city to compare verified hotels with price per night."
          suggestions={QUICK_CITIES}
          onSelectSuggestion={(c) => setCity(c)}
          actionText="Find Stays"
          onAction={handleSearch}
        />
      )}

      {!isLoading && hotels.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
            <span>Showing {hotels.length} hotels in {city}</span>
            <span>Approximate rates converted in S$</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotels.map((h, idx) => (
              <div
                key={h.id || idx}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{h.name}</h3>
                    {h.rating && (
                      <span className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {h.rating}
                      </span>
                    )}
                  </div>

                  {h.address && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{h.address}</span>
                    </p>
                  )}

                  {h.amenities && h.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {h.amenities.slice(0, 4).map((amenity, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Rate per night</span>
                    <span className="text-lg font-black text-indigo-600 font-mono">
                      {h.priceFormatted || (h.pricePerNight ? `S$ ${h.pricePerNight}` : 'View details')}
                    </span>
                  </div>

                  {h.link && (
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Book <ExternalLink className="h-3 w-3" />
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
