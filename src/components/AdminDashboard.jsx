import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import MapView from './MapView';
import AdminSidebar from './AdminSidebar';
import DetailPanel from './DetailPanel';
import PolicyRecommendations from './PolicyRecommendations';
import SearchBar from './SearchBar';
import Header from './Header';
import { useAppState } from '../context/AppContext';
import { fetchImpactMetrics } from '../api/wardApi';

function AdminDashboard() {
  const { wardList } = useAppState();
  const [alerts, setAlerts] = useState([]);
  const [impact, setImpact] = useState(null);
  const alertsRef = useRef(null);
  const impactRef = useRef(null);

  // Fetch impact metrics
  useEffect(() => {
    fetchImpactMetrics().then(setImpact).catch(() => {});
  }, []);

  // Generate alert toasts for wards > AQI 300
  useEffect(() => {
    const severe = wardList.filter(w => w.aqi > 300).sort((a, b) => b.aqi - a.aqi).slice(0, 5);
    setAlerts(severe);
  }, [wardList]);

  // Animate alert toasts in
  useEffect(() => {
    if (alertsRef.current && alerts.length > 0) {
      const items = alertsRef.current.querySelectorAll('.alert-toast');
      gsap.fromTo(items,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.15, ease: 'power2.out', delay: 1.5 }
      );
    }
  }, [alerts]);

  // Animate impact metrics
  useEffect(() => {
    if (impactRef.current && impact) {
      gsap.fromTo(impactRef.current.querySelectorAll('.impact-card'),
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.5 }
      );
    }
  }, [impact]);

  // Dismiss alert
  const dismissAlert = (wardNo) => {
    setAlerts(alerts.filter(a => a.ward_no !== wardNo));
  };

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

      {/* Alert Toasts — top right */}
      {alerts.length > 0 && (
        <div
          ref={alertsRef}
          className="fixed top-20 right-4 z-50 w-72 space-y-2"
        >
          {alerts.map((a) => (
            <div
              key={a.ward_no}
              className="alert-toast rounded-lg px-3 py-2.5 flex items-center gap-2 border shadow-lg"
              style={{
                background: 'rgba(220,38,38,0.12)',
                borderColor: 'rgba(239,68,68,0.25)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-red-200 truncate">
                  ⚠ {a.ward_name}
                </p>
                <p className="text-[9px] text-red-400/70">
                  AQI {a.aqi} — Emergency Protocol Required
                </p>
              </div>
              <button
                onClick={() => dismissAlert(a.ward_no)}
                className="text-red-400/50 hover:text-red-300 text-xs p-1"
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Impact Metrics Bar — top center (below header) */}
      {impact && (
        <div
          ref={impactRef}
          className="absolute top-[76px] left-1/2 -translate-x-1/2 z-10 flex gap-2"
        >
          {[
            { label: 'Data Points', value: impact.data_points_collected.toLocaleString(), icon: '📊', color: '#3b82f6' },
            { label: 'Reports Filed', value: impact.total_reports, icon: '📝', color: '#f59e0b' },
            { label: 'Citizens Alerted', value: impact.citizens_alerted > 1000 ? `${(impact.citizens_alerted / 1000).toFixed(0)}K` : impact.citizens_alerted, icon: '👥', color: '#22c55e' },
            { label: 'Policy Actions', value: impact.policy_actions_triggered, icon: '⚡', color: '#a855f7' },
          ].map((m, i) => (
            <div
              key={i}
              className="impact-card rounded-lg px-3 py-1.5 flex items-center gap-2 border"
              style={{
                background: 'rgba(15,23,42,0.75)',
                borderColor: `${m.color}30`,
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="text-sm">{m.icon}</span>
              <div>
                <p className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[8px] text-gray-500 uppercase">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
