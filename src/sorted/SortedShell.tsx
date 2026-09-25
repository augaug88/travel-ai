import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { Compass, CalendarDays, Sparkles, CircleUserRound, Navigation, UserRound, ArrowLeft } from 'lucide-react';

const TABS = [
  { path: '/sorted/trips', label: 'Trips', icon: Compass },
  { path: '/sorted/itinerary', label: 'Itinerary', icon: CalendarDays },
  { path: '/sorted/explore', label: 'Explore', icon: Sparkles },
  { path: '/sorted/profile', label: 'Profile', icon: CircleUserRound },
];

const TITLES: Record<string, string> = {
  trips: 'Trips',
  itinerary: 'Itinerary',
  explore: 'Explore',
  profile: 'Profile',
};

export function SortedShell() {
  const { pathname } = useLocation();
  const segment = pathname.split('/')[2] || '';
  const title = TITLES[segment] ?? 'Destination';

  return (
    <div className="min-h-screen bg-kanso-bg text-kanso-ink font-sans">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-kanso-bg/90 px-5 pb-3 pt-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              to="/sorted/itinerary"
              aria-label="Voyager home"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kanso-ink text-white"
            >
              <Navigation className="h-6 w-6" />
            </Link>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-kanso-muted">Voyager</p>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/plan"
              className="flex h-10 items-center gap-1 rounded-full px-3 text-xs font-medium text-kanso-muted hover:text-kanso-ink"
              title="Back to SG Trip Planner"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> SG
            </Link>
            <Link
              to="/sorted/profile"
              aria-label="Profile"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-kanso-ink text-white"
            >
              <UserRound className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-5 pb-32">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-kanso-line bg-kanso-bg/95 backdrop-blur-md">
          <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-5 pt-3">
            {TABS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 text-xs transition ${
                    isActive ? 'font-semibold text-kanso-ink' : 'text-kanso-muted hover:text-kanso-ink'
                  }`
                }
              >
                <Icon className="h-6 w-6" strokeWidth={1.8} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-kanso-muted">{children}</h2>
      {right && <span className="text-xs font-medium text-kanso-muted">{right}</span>}
    </div>
  );
}

export function SourceNote({ fetchedAt, extra }: { fetchedAt?: string; extra?: string }) {
  return (
    <p className="mt-6 px-1 text-[11px] text-kanso-muted">
      Data from sorted.travel{extra ? ` · ${extra}` : ''}
      {fetchedAt ? ` · fetched ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
    </p>
  );
}
