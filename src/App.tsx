import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PlanView } from './views/PlanView';
import { FlightsView } from './views/FlightsView';
import { StayView } from './views/StayView';
import { ChangiView } from './views/ChangiView';
import { FxView } from './views/FxView';
import { WeatherView } from './views/WeatherView';
import { ExploreView } from './views/ExploreView';
import { ChatView } from './views/ChatView';
import { SortedShell } from './sorted/SortedShell';
import { SortedDiscoverView } from './views/SortedDiscoverView';
import { SortedPlaceView } from './views/SortedPlaceView';
import { SortedItineraryView } from './views/SortedItineraryView';
import { SortedTripsView } from './views/SortedTripsView';
import { SortedProfileView } from './views/SortedProfileView';
import { useStore } from './sorted/store';

function SortedHome() {
  const { trips } = useStore();
  return <Navigate to={trips.length ? '/sorted/itinerary' : '/sorted/explore'} replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Sorted Travel planner: its own mobile shell */}
        <Route path="/sorted" element={<SortedShell />}>
          <Route index element={<SortedHome />} />
          <Route path="explore" element={<SortedDiscoverView />} />
          <Route path="itinerary" element={<SortedItineraryView />} />
          <Route path="trips" element={<SortedTripsView />} />
          <Route path="profile" element={<SortedProfileView />} />
          <Route path=":handle" element={<SortedPlaceView />} />
        </Route>
        <Route path="*" element={<LegacyLayout />} />
      </Routes>
    </Router>
  );
}

function LegacyLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-900">
      <Navbar />
      <main className="flex-1 px-4 sm:px-6 pt-5">
        <Routes>
          <Route path="/" element={<Navigate to="/plan" replace />} />
          <Route path="/plan" element={<PlanView />} />
          <Route path="/flights" element={<FlightsView />} />
          <Route path="/stay" element={<StayView />} />
          <Route path="/changi" element={<ChangiView />} />
          <Route path="/fx" element={<FxView />} />
          <Route path="/weather" element={<WeatherView />} />
          <Route path="/explore" element={<ExploreView />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>
    </div>
  );
}
