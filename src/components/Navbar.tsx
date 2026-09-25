import { NavLink } from 'react-router-dom';
import {
  Calculator,
  Plane,
  Hotel,
  Clock,
  ArrowRightLeft,
  CloudSun,
  Compass,
  MessageSquare,
  MapPin,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/plan', label: 'Plan', icon: Calculator, badge: 'Budget' },
  { path: '/flights', label: 'Flights', icon: Plane, badge: 'SIN' },
  { path: '/stay', label: 'Stay', icon: Hotel },
  { path: '/changi', label: 'Changi', icon: Clock, badge: 'Leave-By' },
  { path: '/fx', label: 'FX', icon: ArrowRightLeft, badge: 'S$' },
  { path: '/weather', label: 'Weather', icon: CloudSun },
  { path: '/explore', label: 'Explore', icon: Compass },
  { path: '/chat', label: 'Chat', icon: MessageSquare, badge: 'AI' },
  { path: '/sorted', label: 'Sorted', icon: Sparkles, badge: 'New' },
];

export function Navbar() {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-sm shadow-rose-500/20">
              <Plane className="h-5 w-5 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900">SG Trip Planner</span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
                  <MapPin className="h-3 w-3" /> SIN Hub
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Smart Travel for Singaporeans • MCP & Gemini Live</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-rose-500/20 px-1.5 py-0.2 text-[10px] font-bold text-rose-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="hidden sm:inline-block rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono border border-slate-200">
              Default: S$ SGD
            </span>
          </div>
        </div>

        {/* Medium-screen horizontal scroll tab bar */}
        <div className="lg:hidden border-t border-slate-100 bg-slate-50/60 px-2 py-1.5 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 min-w-max px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="h-3 w-3" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md sm:hidden">
        <nav className="grid grid-cols-4 gap-1 p-1">
          {NAV_ITEMS.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold transition rounded-lg ${
                    isActive ? 'text-rose-600 bg-rose-50/80' : 'text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="h-4 w-4 mb-0.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-100">
          <nav className="grid grid-cols-5 gap-1 p-1">
            {NAV_ITEMS.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center py-1.5 text-[10px] font-semibold transition rounded-lg ${
                      isActive ? 'text-rose-600 bg-rose-50/80' : 'text-slate-500 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 mb-0.5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
