import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Sun, Clock, Navigation, SlidersHorizontal, ChevronRight, CirclePlus, Map as MapIcon,
  CircleCheck, Footprints, CalendarDays, ImageOff, Trash2,
} from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { SectionLabel } from '../sorted/SortedShell';
import { getJson } from '../sorted/api';
import { deepFind, firstOf, temp } from '../sorted/pick';
import {
  actions, useActiveTrip, dayDate, todayIndex, formatShortDate, to12h, addMinutes, minutesOfDay,
} from '../sorted/store';
import type { DestinationResult, Stop, StopCategory, StopStatus, Trip } from '../sorted/types';

const CATEGORY_STYLE: Record<StopCategory, string> = {
  Cultural: 'bg-kanso-green-soft text-kanso-green',
  Leisure: 'bg-kanso-line text-kanso-muted',
  Dining: 'bg-kanso-accent-soft text-kanso-accent',
  Transport: 'bg-white text-kanso-ink',
  Other: 'bg-white text-kanso-muted',
};

const mapsDirections = (stop: Stop, trip: Trip) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${stop.title}, ${trip.name}`)}`;
const mapsSearch = (trip: Trip) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([trip.name, trip.country].filter(Boolean).join(', '))}`;

export function SortedItineraryView() {
  const trip = useActiveTrip();
  if (!trip) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={CalendarDays}
          title="No trip yet"
          description="Find a destination in Explore, then tap “Plan a trip here” to start your day-by-day itinerary."
        />
        <Link
          to="/sorted/explore"
          className="mt-4 flex w-full items-center justify-center rounded-2xl bg-kanso-ink py-4 font-semibold text-white"
        >
          Explore destinations
        </Link>
      </div>
    );
  }
  return <TripItinerary key={trip.id} trip={trip} />;
}

function TripItinerary({ trip }: { trip: Trip }) {
  const today = todayIndex(trip);
  const isOnTrip = today >= 1 && today <= trip.days;
  const [day, setDay] = useState(isOnTrip ? today : 1);
  const [editing, setEditing] = useState<Partial<Stop> | null>(null);
  const [now, setNow] = useState(() => new Date());
  const currentTemp = useCurrentTemp(trip.handle);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const stops = useMemo(
    () => trip.stops.filter((s) => s.day === day).sort((a, b) => a.time.localeCompare(b.time)),
    [trip.stops, day]
  );

  // "Up next" is the first stop that has not ended yet (today), or the first stop of another day.
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const isToday = isOnTrip && day === today;
  const upNext = isToday ? stops.find((s) => minutesOfDay(s.time) + s.durationMins > nowMins) : stops[0];
  const rest = stops.filter((s) => s !== upNext && (!isToday || minutesOfDay(s.time) + s.durationMins > nowMins));

  const dayLabel = isOnTrip
    ? `Day ${today} of ${trip.days}`
    : today < 1
      ? `Starts in ${1 - today} day${1 - today === 1 ? '' : 's'}`
      : `${trip.days}-day trip · ended`;

  return (
    <div className="pt-1">
      {/* Location bar */}
      <div className="flex items-center justify-between rounded-2xl bg-kanso-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-kanso-accent" />
          <Link to={`/sorted/${trip.handle}`} className="truncate text-lg font-medium hover:underline">
            {[trip.name, trip.country].filter(Boolean).join(', ')}
          </Link>
          <span className="shrink-0 text-kanso-muted">· {dayLabel}</span>
        </div>
        {currentTemp && (
          <span className="ml-2 flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 text-base">
            <Sun className="h-4 w-4 text-kanso-accent" /> {currentTemp}
          </span>
        )}
      </div>

      {/* Day pills */}
      <div className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1">
        {Array.from({ length: trip.days }, (_, i) => i + 1).map((d) => {
          const active = d === day;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`min-w-[5.5rem] flex-1 rounded-2xl px-3 py-3 text-center transition ${
                active ? 'bg-kanso-ink text-white' : 'bg-kanso-card text-kanso-ink hover:bg-kanso-line'
              }`}
            >
              <p className="text-base font-medium">D{d}</p>
              <p className={`text-sm ${active ? 'text-white/80' : 'text-kanso-muted'}`}>
                {isOnTrip && d === today ? 'Today' : formatShortDate(dayDate(trip, d))}
              </p>
            </button>
          );
        })}
      </div>

      {/* Up next */}
      {upNext ? (
        <UpNextCard trip={trip} stop={upNext} isToday={isToday} nowMins={nowMins} onAdjust={() => setEditing(upNext)} />
      ) : (
        <div className="mt-8 rounded-3xl bg-kanso-card p-6 text-center">
          <p className="text-lg font-semibold">{stops.length ? 'All done for today' : 'Nothing planned yet'}</p>
          <p className="mt-1 text-sm text-kanso-muted">
            {stops.length ? 'Every stop on this day has finished.' : `Add the first stop for ${formatShortDate(dayDate(trip, day))}.`}
          </p>
        </div>
      )}

      <SectionLabel right={`${rest.length} Remaining`}>Planned moments</SectionLabel>
      <div className="space-y-3">
        {rest.map((s) => (
          <MomentRow key={s.id} stop={s} onClick={() => setEditing(s)} />
        ))}
        {rest.length === 0 && <p className="px-1 text-sm text-kanso-muted">No other stops on this day.</p>}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3">
        <button
          onClick={() => setEditing({ day })}
          className="flex items-center justify-center gap-2 rounded-2xl bg-kanso-card py-4 text-lg font-medium shadow-sm hover:bg-kanso-line"
        >
          <CirclePlus className="h-5 w-5" /> Add Stop
        </button>
        <a
          href={mapsSearch(trip)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-kanso-card py-4 text-lg font-medium shadow-sm hover:bg-kanso-line"
        >
          <MapIcon className="h-5 w-5" /> View Full Map
        </a>
      </div>

      {editing && <StopSheet trip={trip} initial={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function useCurrentTemp(handle: string) {
  const [value, setValue] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    getJson<DestinationResult>('/api/sorted/destination', { handle })
      .then((d) => {
        const current = deepFind(d.weather, ['current', 'now', 'current_weather', 'currently', 'today']);
        const t = temp(firstOf(current, ['temperature', 'temp', 'temp_c', 'temperature_c', 'air_temperature']));
        if (!cancelled) setValue(t);
      })
      // The chip is optional; the rest of the screen works without it.
      .catch(() => !cancelled && setValue(undefined));
    return () => {
      cancelled = true;
    };
  }, [handle]);
  return value;
}

function UpNextCard({
  trip, stop, isToday, nowMins, onAdjust,
}: { trip: Trip; stop: Stop; isToday: boolean; nowMins: number; onAdjust: () => void }) {
  const start = to12h(stop.time);
  const end = to12h(addMinutes(stop.time, stop.durationMins));
  const minsAway = minutesOfDay(stop.time) - nowMins;
  const when = !isToday
    ? 'First stop'
    : minsAway <= 0
      ? 'Happening now'
      : minsAway < 60
        ? `In ${minsAway} mins`
        : `In ${Math.floor(minsAway / 60)}h ${minsAway % 60}m`;

  return (
    <section className="mt-8 rounded-3xl bg-kanso-card p-6 shadow-sm">
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-kanso-accent-soft px-3 py-1 text-sm font-semibold uppercase text-kanso-accent">
              {isToday ? 'Up next' : 'First up'}
            </span>
            <span className="text-sm text-kanso-accent">{when}</span>
          </div>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">{stop.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-lg text-kanso-muted">
            <Clock className="h-5 w-5" /> {start.time} {start.period} – {end.time} {end.period}
          </p>
        </div>
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-kanso-line">
          {trip.image ? (
            <img src={trip.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-kanso-muted">
              <ImageOff className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 flex gap-3">
        <a
          href={mapsDirections(stop, trip)}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-kanso-ink py-4 text-lg font-semibold text-white active:scale-[0.99]"
        >
          <Navigation className="h-5 w-5" /> Start Directions
        </a>
        <button
          onClick={onAdjust}
          aria-label="Edit stop"
          className="flex w-16 items-center justify-center rounded-2xl bg-kanso-line hover:bg-kanso-muted/20"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}

function StatusLine({ stop }: { stop: Stop }) {
  if (!stop.status) return null;
  if (stop.status === 'Booked')
    return (
      <span className="flex items-center gap-1 text-kanso-muted">
        <CircleCheck className="h-4 w-4 text-kanso-green" /> Booked
      </span>
    );
  if (stop.status === 'Self-paced')
    return (
      <span className="flex items-center gap-1 text-kanso-muted">
        <Footprints className="h-4 w-4" /> Self-paced
      </span>
    );
  return <span className="text-kanso-accent">{stop.note ? `${stop.note} • ` : ''}Confirmed</span>;
}

function MomentRow({ stop, onClick }: { stop: Stop; onClick: () => void }) {
  const t = to12h(stop.time);
  return (
    <button onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl bg-kanso-card p-4 text-left hover:bg-kanso-line">
      <div className="w-20 shrink-0 rounded-2xl bg-white py-2 text-center">
        <p className="text-lg font-medium">{t.time}</p>
        <p className="text-sm text-kanso-muted">{t.period}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-medium">{stop.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-base">
          <span className={`rounded-md px-2.5 py-0.5 ${CATEGORY_STYLE[stop.category]}`}>{stop.category}</span>
          <StatusLine stop={stop} />
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-kanso-muted" />
    </button>
  );
}

const CATEGORIES: StopCategory[] = ['Cultural', 'Leisure', 'Dining', 'Transport', 'Other'];
const STATUSES: StopStatus[] = ['', 'Booked', 'Confirmed', 'Self-paced'];

function StopSheet({ trip, initial, onClose }: { trip: Trip; initial: Partial<Stop>; onClose: () => void }) {
  const [stop, setStop] = useState<Omit<Stop, 'id'> & { id?: string }>({
    id: initial.id,
    day: initial.day ?? 1,
    time: initial.time ?? '09:00',
    durationMins: initial.durationMins ?? 60,
    title: initial.title ?? '',
    category: initial.category ?? 'Cultural',
    status: initial.status ?? '',
    note: initial.note ?? '',
  });
  const set = <K extends keyof Stop>(k: K, v: Stop[K]) => setStop((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (!stop.title.trim()) return;
    actions.saveStop(trip.id, { ...stop, title: stop.title.trim(), note: stop.note?.trim() });
    onClose();
  };

  const field = 'mt-1.5 block w-full rounded-2xl bg-white px-4 py-3 text-base text-kanso-ink outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-kanso-bg p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-kanso-line" />
        <h3 className="text-xl font-semibold">{stop.id ? 'Edit stop' : 'Add stop'}</h3>

        <label className="mt-4 block text-xs font-medium text-kanso-muted">
          What
          <input value={stop.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Temple walk" className={field} autoFocus />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <label className="block text-xs font-medium text-kanso-muted">
            Day
            <select value={stop.day} onChange={(e) => set('day', Number(e.target.value))} className={field}>
              {Array.from({ length: trip.days }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>D{d}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-kanso-muted">
            Start
            <input type="time" value={stop.time} onChange={(e) => e.target.value && set('time', e.target.value)} className={field} />
          </label>
          <label className="block text-xs font-medium text-kanso-muted">
            Minutes
            <input
              type="number"
              min={5}
              step={5}
              value={stop.durationMins}
              onChange={(e) => set('durationMins', Math.max(5, Number(e.target.value) || 5))}
              className={field}
            />
          </label>
        </div>

        <p className="mt-3 text-xs font-medium text-kanso-muted">Type</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => set('category', c)}
              className={`rounded-full px-3 py-1.5 text-sm ${stop.category === c ? 'bg-kanso-ink text-white' : 'bg-white'}`}
            >
              {c}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-medium text-kanso-muted">Status</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s || 'none'}
              onClick={() => set('status', s)}
              className={`rounded-full px-3 py-1.5 text-sm ${stop.status === s ? 'bg-kanso-ink text-white' : 'bg-white'}`}
            >
              {s || 'None'}
            </button>
          ))}
        </div>

        <label className="mt-3 block text-xs font-medium text-kanso-muted">
          Note (optional)
          <input value={stop.note} onChange={(e) => set('note', e.target.value)} placeholder="e.g. Table for 2" className={field} />
        </label>

        <div className="mt-6 flex gap-2">
          {stop.id && (
            <button
              onClick={() => {
                actions.deleteStop(trip.id, stop.id!);
                onClose();
              }}
              aria-label="Delete stop"
              className="flex w-14 items-center justify-center rounded-2xl bg-kanso-accent-soft text-kanso-accent"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={save}
            disabled={!stop.title.trim()}
            className="flex-1 rounded-2xl bg-kanso-ink py-4 text-base font-semibold text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
