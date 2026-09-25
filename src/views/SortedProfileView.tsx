import { useState } from 'react';
import { Stamp, Plane } from 'lucide-react';
import { SectionLabel } from '../sorted/SortedShell';
import { actions, useStore } from '../sorted/store';
import { COUNTRIES } from '../../lib/countries';

export function SortedProfileView() {
  const { passport, homeAirport } = useStore();
  const [airport, setAirport] = useState(homeAirport || '');
  const validAirport = /^[A-Za-z]{3}$/.test(airport);

  return (
    <div className="pt-1">
      <SectionLabel>Travel defaults</SectionLabel>
      <div className="space-y-3">
        <label className="block rounded-3xl bg-kanso-card p-5">
          <span className="flex items-center gap-2 text-lg font-semibold"><Stamp className="h-5 w-5" /> Passport</span>
          <span className="mt-1 block text-sm text-kanso-muted">Used for visa checks on destination pages.</span>
          <select
            value={passport || 'SG'}
            onChange={(e) => actions.setPassport(e.target.value)}
            className="mt-3 block w-full rounded-2xl bg-white px-4 py-3 text-base outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <div className="rounded-3xl bg-kanso-card p-5">
          <label htmlFor="home-airport" className="flex items-center gap-2 text-lg font-semibold"><Plane className="h-5 w-5" /> Home airport</label>
          <p className="mt-1 text-sm text-kanso-muted">3-letter code used as “Flying from” in Explore.</p>
          <div className="mt-3 flex gap-2">
            <input
              id="home-airport"
              value={airport}
              onChange={(e) => setAirport(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="SIN"
              className="flex-1 rounded-2xl bg-white px-4 py-3 text-base uppercase outline-none"
            />
            <button
              onClick={() => actions.setHomeAirport(airport)}
              disabled={!validAirport || airport === homeAirport}
              className="rounded-2xl bg-kanso-ink px-5 font-semibold text-white disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
      <p className="mt-6 px-1 text-xs text-kanso-muted">Saved in this browser only. No account needed.</p>
    </div>
  );
}
