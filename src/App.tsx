import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { ChatbotDrawer } from './components/ChatbotDrawer.tsx';
import { ItineraryStudio } from './components/ItineraryStudio.tsx';
import { PackingListView } from './components/PackingListView.tsx';
import { CostEstimatorView } from './components/CostEstimatorView.tsx';
import { WeatherInsightsView } from './components/WeatherInsightsView.tsx';
import { GuidesAndToursView } from './components/GuidesAndToursView.tsx';
import { TravelExpertView } from './components/TravelExpertView.tsx';
import { SavedTripsView } from './components/SavedTripsView.tsx';
import { McpInspectorModal } from './components/McpInspectorModal.tsx';
import { Itinerary, ServerStatus } from './types/travel.ts';
import { McpClientService, describeMcpError, useMcpStatus } from './services/mcpClient.ts';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Compass, ShieldCheck, Terminal, Info, X } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'itinerary' | 'packing' | 'budget' | 'weather' | 'tours' | 'expert' | 'trips'>('itinerary');
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [chatbotInitialQuery, setChatbotInitialQuery] = useState<string>('');
  const [appError, setAppError] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const mcpStatus = useMcpStatus();

  // Initial load: Fetch MCP status and initial itinerary
  useEffect(() => {
    McpClientService.getStatus()
      .then(setServerStatus)
      .catch((err) => setAppError(`Server status unavailable: ${describeMcpError(err)}`));

    McpClientService.getItinerary('trip_kyoto_demo_01')
      .then((res) => {
        if (res.itinerary) setCurrentItinerary(res.itinerary);
      })
      .catch((err) => setAppError(`Could not load the sample itinerary: ${describeMcpError(err)}`))
      .finally(() => setIsLoadingInitial(false));
  }, []);

  const handleSelectDestination = (destName: string) => {
    // Generate or switch destination
    McpClientService.createItinerary({
      destination: destName,
      duration_days: 4,
      budget: 'moderate',
      travel_style: 'cultural'
    }).then((res) => {
      if (res.itinerary) {
        setCurrentItinerary(res.itinerary);
        setAppError(null);
      }
    }).catch((err) => {
      setAppError(`Could not create an itinerary for ${destName}: ${describeMcpError(err)}`);
    });
  };

  const handleOpenChatWithQuery = (query: string) => {
    setChatbotInitialQuery(query);
    setIsChatbotOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Header with Navigation, Theme toggle, and MCP Status */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentDestination={currentItinerary?.destination}
        serverStatus={serverStatus}
        onOpenMcpInspector={() => setIsMcpModalOpen(true)}
        onOpenChatDrawer={() => setIsChatbotOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Engaging Relaxing Hero Banner with Visual Graphics and Destination Swapper */}
        <HeroBanner
          currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
          onSelectDestination={handleSelectDestination}
          onOpenChatWithQuery={handleOpenChatWithQuery}
          onOpenChatDrawer={() => setIsChatbotOpen(true)}
        />

        {appError && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm">
            <span>{appError}</span>
            <button onClick={() => setAppError(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'itinerary' && isLoadingInitial && !currentItinerary && (
          <div className="mb-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 animate-pulse">
            Loading the sample itinerary from the MCP server…
          </div>
        )}

        {activeTab === 'itinerary' && (
          <ItineraryStudio
            currentItinerary={currentItinerary}
            setCurrentItinerary={setCurrentItinerary}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'packing' && (
          <PackingListView
            currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
            durationDays={currentItinerary?.durationDays || 4}
          />
        )}

        {activeTab === 'budget' && (
          <CostEstimatorView
            currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
            durationDays={currentItinerary?.durationDays || 4}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherInsightsView
            currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
          />
        )}

        {activeTab === 'tours' && (
          <GuidesAndToursView
            currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
          />
        )}

        {activeTab === 'expert' && (
          <TravelExpertView
            currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
          />
        )}

        {activeTab === 'trips' && (
          <SavedTripsView
            onLoadTrip={(itinerary) => setCurrentItinerary(itinerary)}
            onNavigateToPlanner={() => setActiveTab('itinerary')}
          />
        )}
        <p className="mt-6 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            Data on this screen: {mcpStatus.lastSource ?? 'nothing loaded yet'}.{' '}
            Itineraries, costs, weather, guides and tours are illustrative sample values generated by this app, not live prices, forecasts or bookings.
          </span>
        </p>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">PlanTrip Travel Studio</span>
            <span>•</span>
            <span>{serverStatus ? `${serverStatus.toolsCount} MCP tools at ${serverStatus.mcpPath}` : 'MCP tools'} & AI Concierge</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>No login · trips kept in server memory and this browser</span>
            </span>

            <button
              onClick={() => setIsMcpModalOpen(true)}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>MCP Tool Runner{serverStatus ? ` (${serverStatus.toolsCount})` : ''}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive AI Concierge Chatbot Drawer */}
      <ChatbotDrawer
        isOpen={isChatbotOpen}
        onOpen={() => setIsChatbotOpen(true)}
        onClose={() => setIsChatbotOpen(false)}
        currentDestination={currentItinerary?.destination || 'Kyoto, Japan'}
        onLoadItinerary={(itin) => {
          setCurrentItinerary(itin);
          setActiveTab('itinerary');
        }}
        onNavigateToTab={(tab) => setActiveTab(tab)}
        initialQuery={chatbotInitialQuery}
        onClearInitialQuery={() => setChatbotInitialQuery('')}
      />

      {/* MCP Inspector Modal */}
      <McpInspectorModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
        serverStatus={serverStatus}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
