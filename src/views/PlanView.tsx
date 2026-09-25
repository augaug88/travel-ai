import { useState, useId } from 'react';
import {
  Calculator,
  Plane,
  Hotel,
  Utensils,
  Car,
  Compass,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

interface DestinationInfo {
  name: string;
  code: string;
  currency: string;
}

const POPULAR_DESTINATIONS: DestinationInfo[] = [
  { name: 'Tokyo, Japan', code: 'TYO', currency: 'JPY' },
  { name: 'Bangkok, Thailand', code: 'BKK', currency: 'THB' },
  { name: 'Kuala Lumpur, Malaysia', code: 'KUL', currency: 'MYR' },
  { name: 'Bali, Indonesia', code: 'DPS', currency: 'IDR' },
  { name: 'London, UK', code: 'LON', currency: 'GBP' },
  { name: 'Seoul, South Korea', code: 'SEL', currency: 'KRW' },
  { name: 'Taipei, Taiwan', code: 'TPE', currency: 'TWD' },
];

export function PlanView() {
  const destInputId = useId();
  const nightsInputId = useId();
  const travellersInputId = useId();
  const currInputId = useId();
  const flightInputId = useId();
  const hotelInputId = useId();
  const foodInputId = useId();
  const transInputId = useId();
  const miscInputId = useId();

  const [destination, setDestination] = useState('Tokyo');
  const [destCurrency, setDestCurrency] = useState('JPY');
  const [nights, setNights] = useState<number>(5);
  const [travellers, setTravellers] = useState<number>(2);

  // Big ticket lines
  const [flightPricePerPerson, setFlightPricePerPerson] = useState<number>(450);
  const [hotelPricePerNight, setHotelPricePerNight] = useState<number>(180);

  // Per-day per-person budgets in S$
  const [foodPerDay, setFoodPerDay] = useState<number>(60);
  const [transportPerDay, setTransportPerDay] = useState<number>(20);
  const [miscPerDay, setMiscPerDay] = useState<number>(35);

  // Live upstream sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<{ message: string; source?: string } | null>(null);

  // FX conversion state
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [fxSource, setFxSource] = useState<string | null>(null);
  const [isConvertingFx, setIsConvertingFx] = useState(false);
  const [fxError, setFxError] = useState<{ message: string; source?: string } | null>(null);

  // Client-side math
  const totalFlights = (flightPricePerPerson || 0) * (travellers || 1);
  const totalHotels = (hotelPricePerNight || 0) * (nights || 1);
  const totalFood = (foodPerDay || 0) * (nights || 1) * (travellers || 1);
  const totalTransport = (transportPerDay || 0) * (nights || 1) * (travellers || 1);
  const totalMisc = (miscPerDay || 0) * (nights || 1) * (travellers || 1);

  const grandTotalSgd = totalFlights + totalHotels + totalFood + totalTransport + totalMisc;
  const costPerPersonSgd = travellers > 0 ? grandTotalSgd / travellers : grandTotalSgd;

  // Categories for breakdown
  const categories = [
    { name: 'Flights (SIN)', amount: totalFlights, icon: Plane, color: 'bg-rose-500', text: 'text-rose-600' },
    { name: 'Accommodations', amount: totalHotels, icon: Hotel, color: 'bg-indigo-500', text: 'text-indigo-600' },
    { name: 'Food & Dining', amount: totalFood, icon: Utensils, color: 'bg-amber-500', text: 'text-amber-600' },
    { name: 'Local Transport', amount: totalTransport, icon: Car, color: 'bg-emerald-500', text: 'text-emerald-600' },
    { name: 'Activities & Misc', amount: totalMisc, icon: Compass, color: 'bg-sky-500', text: 'text-sky-600' },
  ];

  // Fetch live estimates from /api/flights, /api/hotels, and /api/fx
  const handleSyncEstimates = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const today = new Date();
      const departDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const returnDate = new Date(today.getTime() + (14 + nights) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // 1. Fetch flights
      const flightRes = await fetch(`/api/flights?from=SIN&to=${encodeURIComponent(destination)}&depart=${departDate}&return=${returnDate}`);
      const flightData = await flightRes.json();
      if (!flightRes.ok) {
        throw new Error(flightData.error || 'Failed to fetch flight estimates');
      }
      if (flightData.flights && flightData.flights.length > 0) {
        const lowestFlight = flightData.flights[0]?.price;
        if (typeof lowestFlight === 'number' && lowestFlight > 0) {
          setFlightPricePerPerson(lowestFlight);
        }
      }

      // 2. Fetch hotels
      const hotelRes = await fetch(`/api/hotels?city=${encodeURIComponent(destination)}&checkin=${departDate}&checkout=${returnDate}`);
      const hotelData = await hotelRes.json();
      if (!hotelRes.ok) {
        throw new Error(hotelData.error || 'Failed to fetch hotel estimates');
      }
      if (hotelData.hotels && hotelData.hotels.length > 0) {
        const firstHotel = hotelData.hotels[0];
        const priceVal = typeof firstHotel?.pricePerNight === 'number' ? firstHotel.pricePerNight : Number(firstHotel?.price) || null;
        if (priceVal && priceVal > 0) {
          setHotelPricePerNight(priceVal);
        }
      }

      // 3. Fetch FX rate for total
      await handleConvertFx(grandTotalSgd, destCurrency);
    } catch (err: any) {
      setSyncError({
        message: err.message || 'Error syncing estimates from external tools',
        source: 'Live MCP Flight / Hotel Tool',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConvertFx = async (amount: number, currency: string) => {
    setIsConvertingFx(true);
    setFxError(null);
    try {
      const res = await fetch(`/api/fx?from=SGD&to=${encodeURIComponent(currency)}&amount=${amount}`);
      const data = await res.json();
      if (!res.ok) {
        setFxError({ message: data.error || 'FX tool failed', source: data.source || 'stockvibes07/exchange-mcp' });
      } else {
        setFxRate(data.rate);
        setFxSource(data.source);
      }
    } catch (err: any) {
      setFxError({ message: err.message || 'Failed to reach FX service', source: 'stockvibes07/exchange-mcp' });
    } finally {
      setIsConvertingFx(false);
    }
  };

  const selectDestination = (dest: DestinationInfo) => {
    setDestination(dest.name.split(',')[0]);
    setDestCurrency(dest.currency);
    handleConvertFx(grandTotalSgd, dest.currency);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">
            <Calculator className="h-3.5 w-3.5" /> Client-Side Trip Budget Calculator
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
            Plan Your Vacation Budget
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Tailored for Singaporean travellers departing from Changi (SIN). Customize trip duration, travellers, and daily expenses with live tool syncing.
          </p>
        </div>
      </div>

      {syncError && <ErrorAlert error={syncError.message} source={syncError.source} onRetry={handleSyncEstimates} />}

      {/* Inputs Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-base font-bold text-slate-900">Trip Parameters</h2>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_DESTINATIONS.slice(0, 4).map((d) => (
              <button
                key={d.name}
                onClick={() => selectDestination(d)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  destination.toLowerCase().includes(d.name.split(',')[0].toLowerCase())
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {d.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor={destInputId} className="block text-xs font-semibold text-slate-700 mb-1">Destination City</label>
            <input
              id={destInputId}
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
              placeholder="e.g. Tokyo, Bangkok"
            />
          </div>

          <div>
            <label htmlFor={nightsInputId} className="block text-xs font-semibold text-slate-700 mb-1">Duration (Nights)</label>
            <input
              id={nightsInputId}
              type="number"
              min={1}
              max={60}
              value={nights}
              onChange={(e) => setNights(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor={travellersInputId} className="block text-xs font-semibold text-slate-700 mb-1">Travellers (Pax)</label>
            <input
              id={travellersInputId}
              type="number"
              min={1}
              max={20}
              value={travellers}
              onChange={(e) => setTravellers(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor={currInputId} className="block text-xs font-semibold text-slate-700 mb-1">Local Currency</label>
            <input
              id={currInputId}
              type="text"
              value={destCurrency}
              onChange={(e) => setDestCurrency(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium uppercase focus:border-rose-500 focus:outline-hidden"
              placeholder="JPY, THB, MYR..."
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">Sync with Kiwi Flights & Google Hotels tools</p>
          <button
            onClick={handleSyncEstimates}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            {isSyncing ? 'Syncing Live Tools...' : 'Fetch Live Estimates'}
          </button>
        </div>
      </div>

      {/* Cost Line Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Major Lines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plane className="h-4 w-4 text-rose-600" /> Big-Ticket Expenses
          </h3>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor={flightInputId}>Flight (return per pax from SIN)</label>
              <span className="font-mono text-rose-600 font-bold">S$ {flightPricePerPerson}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">S$</span>
              <input
                id={flightInputId}
                type="number"
                min={0}
                value={flightPricePerPerson}
                onChange={(e) => setFlightPricePerPerson(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Subtotal for {travellers} travellers: S$ {totalFlights.toLocaleString()}</p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor={hotelInputId}>Accommodation (per night)</label>
              <span className="font-mono text-indigo-600 font-bold">S$ {hotelPricePerNight}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">S$</span>
              <input
                id={hotelInputId}
                type="number"
                min={0}
                value={hotelPricePerNight}
                onChange={(e) => setHotelPricePerNight(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Subtotal for {nights} nights: S$ {totalHotels.toLocaleString()}</p>
          </div>
        </div>

        {/* Daily Per-Person Allowances */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Utensils className="h-4 w-4 text-amber-600" /> Daily Allowances (per person in S$)
          </h3>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor={foodInputId}>Food & Dining (per day)</label>
              <span className="font-mono text-amber-600 font-bold">S$ {foodPerDay}</span>
            </div>
            <input
              id={foodInputId}
              type="number"
              min={0}
              value={foodPerDay}
              onChange={(e) => setFoodPerDay(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor={transInputId}>Local Transport / Subway / Grab (per day)</label>
              <span className="font-mono text-emerald-600 font-bold">S$ {transportPerDay}</span>
            </div>
            <input
              id={transInputId}
              type="number"
              min={0}
              value={transportPerDay}
              onChange={(e) => setTransportPerDay(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor={miscInputId}>Attractions & Miscellaneous (per day)</label>
              <span className="font-mono text-sky-600 font-bold">S$ {miscPerDay}</span>
            </div>
            <input
              id={miscInputId}
              type="number"
              min={0}
              value={miscPerDay}
              onChange={(e) => setMiscPerDay(parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium focus:border-rose-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Summary Card & Category Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Total Budget</span>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 font-mono">
                S$ {grandTotalSgd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                (S$ {Math.round(costPerPersonSgd).toLocaleString()} / person)
              </span>
            </div>
          </div>

          {/* Converted into Destination Currency */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 min-w-[240px]">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>In Destination Currency</span>
              <button
                onClick={() => handleConvertFx(grandTotalSgd, destCurrency)}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                {isConvertingFx ? 'Updating...' : 'Refresh FX'}
              </button>
            </div>
            {isConvertingFx ? (
              <div className="h-6 w-32 animate-pulse bg-slate-200 rounded-sm" />
            ) : fxRate ? (
              <div>
                <p className="text-xl font-bold font-mono text-slate-900">
                  {destCurrency} {(grandTotalSgd * fxRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  1 SGD = {fxRate.toFixed(4)} {destCurrency}
                </p>
              </div>
            ) : (
              <button
                onClick={() => handleConvertFx(grandTotalSgd, destCurrency)}
                className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1"
              >
                Fetch rate for {destCurrency} <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {fxError && <p className="mt-1 text-[11px] text-rose-600">{fxError.message}</p>}
          </div>
        </div>

        {/* Category Breakdown Bar */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Category Breakdown</h4>

          {/* Multi-segment progress bar */}
          <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden mb-4">
            {categories.map((c) => {
              const pct = grandTotalSgd > 0 ? (c.amount / grandTotalSgd) * 100 : 0;
              return (
                <div
                  key={c.name}
                  style={{ width: `${pct}%` }}
                  className={`${c.color} h-full transition-all duration-300`}
                  title={`${c.name}: S$ ${c.amount.toLocaleString()} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const pct = grandTotalSgd > 0 ? Math.round((cat.amount / grandTotalSgd) * 100) : 0;
              return (
                <div key={cat.name} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-3.5 w-3.5 ${cat.text}`} />
                    <span className="text-xs font-medium text-slate-600 truncate">{cat.name}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 font-mono">S$ {cat.amount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400">{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
