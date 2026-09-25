import { Link, useNavigate } from 'react-router-dom';
import { Compass, Trash2, ChevronRight, ImageOff } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { SectionLabel } from '../sorted/SortedShell';
import { actions, useStore, dayDate, formatShortDate } from '../sorted/store';

export function SortedTripsView() {
  const { trips, activeTripId } = useStore();
  const navigate = useNavigate();
  const activeId = activeTripId ?? trips[0]?.id;

  if (!trips.length) {
    return (
      <div className="pt-4">
        <EmptyState icon={Compass} title="No trips yet" description="Trips you plan from a destination page show up here." />
        <Link to="/sorted/explore" className="mt-4 flex w-full items-center justify-center rounded-2xl bg-kanso-ink py-4 font-semibold text-white">
          Explore destinations
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <SectionLabel right={`${trips.length} saved`}>Your trips</SectionLabel>
      <div className="space-y-3">
        {trips.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-3xl bg-kanso-card p-3">
            <button
              onClick={() => {
                actions.setActive(t.id);
                navigate('/sorted/itinerary');
              }}
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-kanso-line">
                {t.image ? (
                  <img src={t.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-kanso-muted"><ImageOff className="h-5 w-5" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{t.name}</p>
                <p className="truncate text-sm text-kanso-muted">
                  {formatShortDate(dayDate(t, 1))} – {formatShortDate(dayDate(t, t.days))} · {t.stops.length} stops
                </p>
                {t.id === activeId && <span className="mt-1 inline-block rounded-full bg-kanso-ink px-2 py-0.5 text-[11px] font-semibold text-white">Current</span>}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-kanso-muted" />
            </button>
            <button
              onClick={() => confirm(`Delete the trip to ${t.name}?`) && actions.deleteTrip(t.id)}
              aria-label={`Delete trip to ${t.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-kanso-muted hover:bg-kanso-accent-soft hover:text-kanso-accent"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
