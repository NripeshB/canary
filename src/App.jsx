import React, { useEffect } from 'react';
import { useAppState, useAppDispatch } from './context/AppContext';
import { fetchWards, fetchWardDetail, fetchHotspots, fetchCityTrend, fetchSourceMap } from './api/wardApi';
import MapView from './components/MapView';
import SearchBar from './components/SearchBar';
import DetailPanel from './components/DetailPanel';
import LeftPanel from './components/LeftPanel';
import DistrictList from './components/DistrictList';
import ReportModal from './components/ReportModal';
import ReportFAB from './components/ReportFAB';
import Header from './components/Header';
import HotspotCards from './components/HotspotCards';
import CityTrendChart from './components/CityTrendChart';

function App() {
  const { isLoading, error, selectedWard } = useAppState();
  const dispatch = useAppDispatch();

  // Load initial data from backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        // Load GeoJSON from public folder (stays on frontend)
        const geoRes = await fetch('/delhiWards.json');
        if (!geoRes.ok) throw new Error(`GeoJSON load failed: ${geoRes.status}`);
        const geojson = await geoRes.json();

        // Load all API data in parallel
        const [wardList, hotspots, cityTrend, sourceMapData] = await Promise.all([
          fetchWards(),
          fetchHotspots(5),
          fetchCityTrend(),
          fetchSourceMap(),
        ]);

        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: { geojson, wardList, hotspots, cityTrend, sourceMapData },
        });
      } catch (err) {
        console.error('Initial data load failed:', err);
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    }
    loadInitialData();
  }, [dispatch]);

  // Fetch ward detail when selection changes
  useEffect(() => {
    if (!selectedWard) return;
    async function loadDetail() {
      try {
        const detail = await fetchWardDetail(selectedWard);
        dispatch({ type: 'SET_WARD_DETAIL', payload: detail });
      } catch (err) {
        console.error('Ward detail load failed:', err);
      }
    }
    loadDetail();
  }, [selectedWard, dispatch]);

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="glass-panel-solid rounded-2xl p-10 max-w-lg text-center border border-white/[0.05]">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-100 mb-3">System Initialization Failed</h1>
          <p className="text-sm text-gray-400 mb-3">Could not connect to the AQI Intelligence backend. Make sure both services are running:</p>
          <div className="text-left bg-white/[0.02] rounded-xl p-4 mb-5 border border-white/[0.05]">
            <p className="text-xs text-gray-500 font-mono mb-1">Backend:</p>
            <p className="text-xs text-gray-300 font-mono mb-3">cd backend && python manage.py runserver 8000</p>
            <p className="text-xs text-gray-500 font-mono mb-1">Frontend:</p>
            <p className="text-xs text-gray-300 font-mono">npm run dev</p>
          </div>
          <p className="text-xs text-red-400 font-mono mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl text-sm font-semibold transition-all border border-accent/30"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full viewport map */}
      <MapView />

      {/* Top toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-start gap-3" style={{ right: selectedWard ? '380px' : '300px' }}>
        <Header />
        <div className="flex-1 max-w-sm ml-auto">
          <SearchBar />
        </div>
      </div>

      {/* Landing page overlays (hidden when ward selected) */}
      <HotspotCards />
      <CityTrendChart />

      {/* Left analysis panel (shows on ward selection) */}
      <LeftPanel />

      {/* Right detail panel (shows on ward selection) */}
      <DetailPanel />

      {/* District list sidebar */}
      <DistrictList />

      {/* Report FAB + Modal */}
      <ReportFAB />
      <ReportModal />
    </div>
  );
}

export default App;
