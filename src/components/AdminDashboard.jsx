import React from 'react';
import MapView from './MapView';
import AdminSidebar from './AdminSidebar';
import DetailPanel from './DetailPanel';
import PolicyRecommendations from './PolicyRecommendations';
import SearchBar from './SearchBar';
import Header from './Header';

function AdminDashboard() {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full viewport map */}
      <MapView />

      {/* Top toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-start gap-3" style={{ right: '300px' }}>
        <Header />
        <div className="flex-1 max-w-sm ml-auto">
          <SearchBar />
        </div>
      </div>

      {/* Admin Sidebar (always visible) */}
      <AdminSidebar />

      {/* Right detail panel (shows on ward selection) */}
      <DetailPanel />

      {/* Policy Recommendations Bar (bottom) */}
      <PolicyRecommendations />
    </div>
  );
}

export default AdminDashboard;
