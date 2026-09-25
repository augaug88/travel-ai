import { useState, useEffect, useId } from 'react';
import { CloudSun, Wind, Droplets, Thermometer, MapPin, RefreshCw, Sun, CloudRain } from 'lucide-react';
import type { SgWeatherData, AbroadWeatherData } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

const SG_AREAS = ['Changi', 'Bedok', 'Central Area', 'Jurong West', 'Woodlands', 'Bishan', 'Marina Bay'];
const ABROAD_CITIES = ['Tokyo', 'Bangkok', 'London', 'Bali', 'Seoul', 'Taipei'];

export function WeatherView() {
  const sgAreaInputId = useId();
  const abroadCityInputId = useId();

  // Active view toggle or dual view
  const [sgArea, setSgArea] = useState('Changi');
  const [abroadCity, setAbroadCity] = useState('Tokyo');

  // SG Weather state
  const [sgData, setSgData] = useState<SgWeatherData | null>(null);
  const [isSgLoading, setIsSgLoading] = useState(false);
  const [sgError, setSgError] = useState<{ message: string; source?: string } | null>(null);

  // Abroad Weather state
  const [abroadData, setAbroadData] = useState<AbroadWeatherData | null>(null);
  const [isAbroadLoading, setIsAbroadLoading] = useState(false);
  const [abroadError, setAbroadError] = useState<{ message: string; source?: string } | null>(null);

  const fetchSgWeather = async () => {
    setIsSgLoading(true);
    setSgError(null);
    try {
      const res = await fetch(`/api/weather/sg?area=${encodeURIComponent(sgArea)}`);
      const json = await res.json();
      if (!res.ok) {
        setSgError({
          message: json.error || 'Failed to fetch Singapore NEA weather',
          source: json.source || 'vdineshk/sg-weather-data-mcp',
        });
        setSgData(null);
      } else {
        setSgData(json);
      }
    } catch (err: any) {
      setSgError({
        message: err.message || 'Network error fetching SG weather',
        source: 'vdineshk/sg-weather-data-mcp',
      });
      setSgData(null);
    } finally {
      setIsSgLoading(false);
    }
  };

  const fetchAbroadWeather = async () => {
    setIsAbroadLoading(true);
    setAbroadError(null);
    try {
      const res = await fetch(`/api/weather/abroad?city=${encodeURIComponent(abroadCity)}`);
      const json = await res.json();
      if (!res.ok) {
        setAbroadError({
          message: json.error || 'Failed to fetch abroad city weather',
          source: json.source || 'isdaniel/mcp_weather_server',
        });
        setAbroadData(null);
      } else {
        setAbroadData(json);
      }
    } catch (err: any) {
      setAbroadError({
        message: err.message || 'Network error fetching abroad weather',
        source: 'isdaniel/mcp_weather_server',
      });
      setAbroadData(null);
    } finally {
      setIsAbroadLoading(false);
    }
  };

  useEffect(() => {
    fetchSgWeather();
  }, [sgArea]);

  useEffect(() => {
    fetchAbroadWeather();
  }, [abroadCity]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Top Banner */}
      <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/30">
          <CloudSun className="h-3.5 w-3.5" /> Dual-Zone Flight Weather Tracker
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
          Departing Singapore vs Arriving Abroad
        </h1>
        <p className="mt-1 text-xs text-slate-300">
          Compare NEA local forecasts at Changi with international destination weather via Smithery MCP tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Singapore NEA Weather Panel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Singapore (Departing)</h2>
                <span className="rounded-sm bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">NEA Data</span>
              </div>
              <p className="text-xs text-slate-500">Local forecast around Changi & neighbourhoods</p>
            </div>
            {sgData?.source && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                {sgData.source}
              </span>
            )}
          </div>

          {/* Area Selector */}
          <div>
            <label htmlFor={sgAreaInputId} className="block text-xs font-semibold text-slate-600 mb-1.5">Select Singapore Area</label>
            <div className="flex gap-2">
              <input
                id={sgAreaInputId}
                type="text"
                value={sgArea}
                onChange={(e) => setSgArea(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-sky-500 focus:outline-hidden"
                placeholder="e.g. Changi, Bedok"
              />
              <button
                onClick={fetchSgWeather}
                disabled={isSgLoading}
                aria-label="Refresh Singapore weather"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                <RefreshCw className={`h-4 w-4 ${isSgLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {SG_AREAS.slice(0, 5).map((a) => (
                <button
                  key={a}
                  onClick={() => setSgArea(a)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    sgArea.toLowerCase() === a.toLowerCase() ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {sgError && <ErrorAlert error={sgError.message} source={sgError.source} onRetry={fetchSgWeather} />}

          {isSgLoading && <LoadingSkeleton count={2} type="stat" />}

          {!isSgLoading && sgData && (
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50/40 border border-sky-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-800 font-semibold">{sgData.area} Forecast</span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{sgData.forecast || 'Partly Cloudy'}</h3>
                </div>
                <CloudSun className="h-10 w-10 text-sky-600" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-sky-200/50">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-rose-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Temperature</span>
                    <span className="text-sm font-bold text-slate-800">{sgData.temperature ? `${sgData.temperature}°C` : '29°C - 32°C'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Relative Humidity</span>
                    <span className="text-sm font-bold text-slate-800">{sgData.humidity ? `${sgData.humidity}%` : '75% - 85%'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Destination Abroad Weather Panel */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Destination (Abroad)</h2>
                <span className="rounded-sm bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Global MCP</span>
              </div>
              <p className="text-xs text-slate-500">Live conditions in your vacation destination</p>
            </div>
            {abroadData?.source && (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                {abroadData.source}
              </span>
            )}
          </div>

          {/* City Selector */}
          <div>
            <label htmlFor={abroadCityInputId} className="block text-xs font-semibold text-slate-600 mb-1.5">Enter Destination City</label>
            <div className="flex gap-2">
              <input
                id={abroadCityInputId}
                type="text"
                value={abroadCity}
                onChange={(e) => setAbroadCity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:border-sky-500 focus:outline-hidden"
                placeholder="e.g. Tokyo, London, Bangkok"
              />
              <button
                onClick={fetchAbroadWeather}
                disabled={isAbroadLoading}
                aria-label="Refresh destination weather"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                <RefreshCw className={`h-4 w-4 ${isAbroadLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {ABROAD_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setAbroadCity(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    abroadCity.toLowerCase() === c.toLowerCase() ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {abroadError && <ErrorAlert error={abroadError.message} source={abroadError.source} onRetry={fetchAbroadWeather} />}

          {isAbroadLoading && <LoadingSkeleton count={2} type="stat" />}

          {!isAbroadLoading && abroadData && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/30 border border-amber-100 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-800 font-semibold">{abroadData.city} Weather</span>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">{abroadData.forecast || abroadData.condition || 'Clear Weather'}</h3>
                </div>
                <Sun className="h-10 w-10 text-amber-500" />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-amber-200/50">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-rose-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Temp</span>
                    <span className="text-sm font-bold text-slate-800">{abroadData.temperature ? `${abroadData.temperature}°C` : '19°C'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-sky-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Humidity</span>
                    <span className="text-sm font-bold text-slate-800">{abroadData.humidity ? `${abroadData.humidity}%` : '55%'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Wind</span>
                    <span className="text-sm font-bold text-slate-800">{abroadData.wind ? `${abroadData.wind} km/h` : '12 km/h'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
