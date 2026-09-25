import { useState, useEffect, useId } from 'react';
import { ArrowRightLeft, RefreshCw, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import type { FxData } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const POPULAR_CURRENCIES = [
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'KRW', name: 'South Korean Won', flag: '🇰🇷' },
  { code: 'TWD', name: 'New Taiwan Dollar', flag: '🇹🇼' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
];

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 2500];

export function FxView() {
  const fromInputId = useId();
  const toInputId = useId();
  const amtInputId = useId();

  const [from, setFrom] = useState('SGD');
  const [to, setTo] = useState('JPY');
  const [amount, setAmount] = useState<number>(100);

  const [data, setData] = useState<FxData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; source?: string } | null>(null);

  const fetchFx = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/fx?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${amount}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        setError({
          message: json.error || 'Failed to fetch currency exchange rate',
          source: json.source || 'stockvibes07/exchange-mcp',
        });
        setData(null);
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error fetching FX rate',
        source: 'stockvibes07/exchange-mcp',
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFx();
  }, [to]);

  const swapCurrencies = () => {
    const prevFrom = from;
    setFrom(to);
    setTo(prevFrom);
  };

  const invertedRate = data?.rate && data.rate > 0 ? 1 / data.rate : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header Banner */}
      <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              <ArrowRightLeft className="h-3.5 w-3.5" /> Singapore Dollar Foreign Exchange
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Live FX Currency Converter
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Live mid-market rates from exchange-mcp via Smithery. Default base: Singapore Dollar (S$).
            </p>
          </div>
          {data?.source && (
            <span className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              Provider: {data.source}
            </span>
          )}
        </div>

        {/* Currency Controls Card */}
        <div className="mt-6 rounded-2xl bg-white p-4 sm:p-6 text-slate-900 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
            {/* From */}
            <div className="md:col-span-3">
              <label htmlFor={fromInputId} className="block text-xs font-semibold text-slate-600 mb-1">From Currency</label>
              <input
                id={fromInputId}
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-bold font-mono uppercase focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center md:col-span-1">
              <button
                type="button"
                onClick={swapCurrencies}
                aria-label="Swap currencies"
                className="rounded-full border border-slate-200 bg-slate-50 p-2.5 text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </button>
            </div>

            {/* To */}
            <div className="md:col-span-3">
              <label htmlFor={toInputId} className="block text-xs font-semibold text-slate-600 mb-1">To Currency</label>
              <input
                id={toInputId}
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base font-bold font-mono uppercase focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor={amtInputId} className="block text-xs font-semibold text-slate-600 mb-1">Amount to Convert</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                  {from === 'SGD' ? 'S$' : from}
                </span>
                <input
                  id={amtInputId}
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-sm font-bold font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 self-end">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Quick S$:</span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    amount === amt ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  S$ {amt}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Currency Chips */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400 font-medium block mb-2">Common Singapore Travel Currencies:</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => setTo(curr.code)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    to === curr.code
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{curr.flag}</span>
                  <span>{curr.code}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={fetchFx}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Converting...' : 'Convert Now'}
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert error={error.message} source={error.source} onRetry={fetchFx} />}

      {isLoading && <LoadingSkeleton count={2} type="stat" />}

      {/* Conversion Output Card */}
      {!isLoading && data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Converted Output */}
          <div className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Converted Total</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                {data.formatted_converted}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              For {from === 'SGD' ? `S$ ${amount.toLocaleString()}` : `${amount.toLocaleString()} ${from}`}
            </p>

            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Direct Rate</span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  1 {data.from} = {data.rate.toFixed(4)} {data.to}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="text-[11px] text-slate-400 block font-medium">Inverted Rate</span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  1 {data.to} = {invertedRate.toFixed(4)} {data.from}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Denominations cheat-sheet */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Quick Reference Guide</h3>
            <div className="space-y-2.5 text-xs font-mono">
              {[10, 50, 100, 500, 1000].map((baseVal) => {
                const convertedVal = baseVal * data.rate;
                return (
                  <div key={baseVal} className="flex justify-between py-1.5 border-b border-slate-100 last:border-b-0">
                    <span className="text-slate-600 font-medium">
                      {from === 'SGD' ? `S$ ${baseVal}` : `${baseVal} ${from}`}
                    </span>
                    <span className="font-bold text-slate-900">
                      {convertedVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} {data.to}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
