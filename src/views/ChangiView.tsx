import { useState, useEffect, useId } from 'react';
import { Clock, AlertTriangle, ShieldCheck, MapPin, RefreshCw, Car, Info, ArrowRight } from 'lucide-react';
import type { ChangiData } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const SG_NEIGHBOURHOODS = ['Orchard', 'Jurong East', 'Bishan', 'Tampines', 'Woodlands', 'Punggol', 'Marina Bay'];

export function ChangiView() {
  const fromInputId = useId();
  const timeInputId = useId();

  const [from, setFrom] = useState('Orchard');
  const [flightTime, setFlightTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4, 30, 0, 0);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });

  const [data, setData] = useState<ChangiData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; source?: string } | null>(null);

  const fetchChangiStatus = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/changi?from=${encodeURIComponent(from)}&flight_time=${encodeURIComponent(flightTime)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!res.ok) {
        setError({
          message: json.error || 'Failed to fetch Changi traffic and timing calculation',
          source: json.source || 'hithereiamaliff/mcp-ltadatamallsg',
        });
        setData(null);
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error fetching Changi data',
        source: 'hithereiamaliff/mcp-ltadatamallsg',
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChangiStatus();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30">
              <Clock className="h-3.5 w-3.5" /> Singapore Airport Departure Butler
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Changi "Leave By" Calculator
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Accounts for standard 3h airport lead time plus +15 min buffer per live LTA incident on ECP/PIE/TPE/KPE.
            </p>
          </div>
          {data?.source && (
            <span className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-1 text-xs font-mono text-slate-300">
              Source: {data.source}
            </span>
          )}
        </div>

        {/* Inputs */}
        <div className="mt-6 rounded-2xl bg-white p-4 sm:p-5 text-slate-900 shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={fromInputId} className="block text-xs font-semibold text-slate-600 mb-1">Departing From (Singapore location)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-rose-600" />
                <input
                  id={fromInputId}
                  type="text"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-semibold focus:border-rose-500 focus:outline-hidden"
                  placeholder="e.g. Orchard, Jurong East, Woodlands"
                />
              </div>
            </div>

            <div>
              <label htmlFor={timeInputId} className="block text-xs font-semibold text-slate-600 mb-1">Flight Departure Time (24h or HH:mm)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  id={timeInputId}
                  type="time"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm font-bold font-mono focus:border-rose-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium mr-1">Locations:</span>
              {SG_NEIGHBOURHOODS.slice(0, 5).map((loc) => (
                <button
                  key={loc}
                  onClick={() => setFrom(loc)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    from.toLowerCase() === loc.toLowerCase() ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>

            <button
              onClick={fetchChangiStatus}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Recalculating...' : 'Recalculate Timing'}
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert error={error.message} source={error.source} onRetry={fetchChangiStatus} />}

      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <div className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            Querying LTA DataMall live traffic incidents...
          </div>
          <LoadingSkeleton count={2} type="card" />
        </div>
      )}

      {/* Main Leave-By Hero Card */}
      {!isLoading && data && (
        <div className="rounded-3xl border-2 border-rose-200 bg-gradient-to-b from-white to-rose-50/30 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider">
                <Car className="h-4 w-4" /> Recommended Departure Time from {from}
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-black text-slate-950 font-mono tracking-tight">
                  {data.leave_by}
                </span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                  Leave By
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                To reach Changi Airport comfortably for your <span className="font-bold text-slate-800">{data.flight_time}</span> flight.
              </p>
            </div>

            {/* Timing Breakdown Breakdown Box */}
            <div className="rounded-2xl bg-white border border-slate-200 p-4 min-w-[280px] shadow-xs">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Calculation Breakdown</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Flight Departure</span>
                  <span className="font-mono font-bold text-slate-900">{data.flight_time}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Standard Lead Time</span>
                  <span className="font-mono font-bold text-slate-900">− {data.standard_lead_hours}h 00m</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    Expressway Incident Buffer ({data.incident_count} × 15m)
                  </span>
                  <span className="font-mono font-bold text-rose-600">
                    {data.incident_buffer_minutes > 0 ? `− ${data.incident_buffer_minutes}m` : '0m (Clear)'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                  <span>Final "Leave By"</span>
                  <span className="font-mono text-rose-600">{data.leave_by}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expressway Monitoring Grid */}
          <div className="mt-8 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Monitored Changi Airport Expressways
              </h4>
              <span className="text-[11px] text-slate-500">
                {data.all_incidents_count} total nationwide incidents in LTA DataMall
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {['ECP', 'PIE', 'TPE', 'KPE'].map((exp) => {
                const count = data.affecting_incidents.filter((i) => i.expressway === exp).length;
                const isClear = count === 0;

                return (
                  <div
                    key={exp}
                    className={`rounded-xl border p-3.5 transition ${
                      isClear
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                        : 'border-rose-300 bg-rose-50 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm">{exp}</span>
                      {isClear ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-semibold">
                      {isClear ? 'Traffic Flowing' : `${count} Incident Active`}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {exp === 'ECP' && 'Direct City & South route'}
                      {exp === 'PIE' && 'Central & West link to Changi'}
                      {exp === 'TPE' && 'North & North-East link'}
                      {exp === 'KPE' && 'North-East tunnel link'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* List of active affecting incidents */}
            {data.affecting_incidents.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-rose-900">Active Incidents Impacting Route to Changi:</p>
                {data.affecting_incidents.map((inc, i) => (
                  <div key={inc.id || i} className="rounded-xl border border-rose-200 bg-white p-3 shadow-2xs">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-sm bg-rose-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700">
                            {inc.expressway}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{inc.type}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 leading-snug">{inc.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 flex items-center gap-3 text-xs text-emerald-800">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>
                  No traffic incidents currently reported on ECP, PIE, TPE, or KPE toward Changi Airport. Standard 3-hour lead time applies.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
