import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import ChangiPage from "./pages/Changi";
import ChatPage from "./pages/Chat";
import ExplorePage from "./pages/Explore";
import FlightsPage from "./pages/Flights";
import FxPage from "./pages/Fx";
import PlanPage from "./pages/Plan";
import StayPage from "./pages/Stay";
import WeatherPage from "./pages/Weather";

const TABS = [
  { to: "/plan", label: "Plan", icon: "🧮" },
  { to: "/flights", label: "Flights", icon: "✈️" },
  { to: "/stay", label: "Stay", icon: "🏨" },
  { to: "/changi", label: "Changi", icon: "🚕" },
  { to: "/fx", label: "FX", icon: "💱" },
  { to: "/weather", label: "Weather", icon: "🌦️" },
  { to: "/explore", label: "Explore", icon: "🗺️" },
  { to: "/chat", label: "Chat", icon: "💬" },
];

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>SG Trip Planner</h1>
        <span className="topbar-sub">Live data via your Smithery toolbox</span>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/plan" replace />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/stay" element={<StayPage />} />
          <Route path="/changi" element={<ChangiPage />} />
          <Route path="/fx" element={<FxPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "tab active" : "tab")}>
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
