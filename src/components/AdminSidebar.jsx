import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';

function AdminSidebar() {
  const { wardList, geojson, selectedWard } = useAppState();
  const dispatch = useAppDispatch();
  const panelRef = useRef(null);
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Animate in
  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current,
        { x: '-100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.2 }
      );
    }
  }, []);

  // Compute KPIs
  const kpis = useMemo(() => {
    const total = wardList.length;
    const avgAqi = total > 0 ? Math.round(wardList.reduce((s, w) => s + w.aqi, 0) / total) : 0;
    const severeCount = wardList.filter(w => w.aqi > 300).length;
    const poorCount = wardList.filter(w => w.aqi > 200).length;
    const popAtRisk = wardList.filter(w => w.aqi > 200).reduce((s, w) => s + (w.population || 0), 0);
    return { total, avgAqi, severeCount, poorCount, popAtRisk };
  }, [wardList]);

  // District list for filter
  const districts = useMemo(() => {
    const set = new Set(wardList.map(w => w.district).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [wardList]);

  // Filtered & sorted wards
  const filteredWards = useMemo(() => {
    let list = [...wardList];
    if (filterDistrict !== 'all') {
      list = list.filter(w => w.district === filterDistrict);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w => w.ward_name?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.aqi - a.aqi);
  }, [wardList, filterDistrict, searchQuery]);

  const handleWardClick = (ward) => {
    const feature = geojson?.features?.find(f => f.properties?.Ward_No === ward.ward_no);
    if (feature) {
      dispatch({ type: 'SELECT_WARD', payload: { wardNo: ward.ward_no, feature } });
    }
  };

  return (
    <div
      ref={panelRef}
      className="fixed left-0 top-0 h-full w-[320px] z-20 glass-panel-solid shadow-2xl shadow-black/60 flex flex-col -translate-x-full"
    >
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center border border-accent/20">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-gray-50">Command Center</h2>
            <p className="text-[9px] text-gray-500">Policy Intelligence Dashboard</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-center">
            <p className="text-[9px] text-gray-500 uppercase font-bold">Wards Monitored</p>
            <p className="text-lg font-extrabold text-gray-100 font-mono">{kpis.total}</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-3 py-2.5 text-center">
            <p className="text-[9px] text-gray-500 uppercase font-bold">City Avg AQI</p>
            <p className="text-lg font-extrabold font-mono" style={{ color: getAqiColor(kpis.avgAqi) }}>{kpis.avgAqi}</p>
          </div>
          <div className="rounded-lg bg-red-500/[0.06] border border-red-500/[0.15] px-3 py-2.5 text-center">
            <p className="text-[9px] text-red-400/70 uppercase font-bold">Severe Wards</p>
            <p className="text-lg font-extrabold text-red-400 font-mono">{kpis.severeCount}</p>
          </div>
          <div className="rounded-lg bg-orange-500/[0.06] border border-orange-500/[0.15] px-3 py-2.5 text-center">
            <p className="text-[9px] text-orange-400/70 uppercase font-bold">Pop. at Risk</p>
            <p className="text-sm font-extrabold text-orange-400 font-mono">
              {kpis.popAtRisk > 1000000
                ? `${(kpis.popAtRisk / 1000000).toFixed(1)}M`
                : kpis.popAtRisk > 1000
                ? `${(kpis.popAtRisk / 1000).toFixed(0)}K`
                : kpis.popAtRisk.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-3 border-b border-white/[0.05] flex-shrink-0 space-y-2">
        <input
          type="text"
          placeholder="Search wards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-accent/30 transition-colors"
        />
        <select
          value={filterDistrict}
          onChange={(e) => setFilterDistrict(e.target.value)}
          className="w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs text-gray-300 outline-none focus:border-accent/30 transition-colors appearance-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          {districts.map(d => (
            <option key={d} value={d} className="bg-surface-100 text-gray-200">
              {d === 'all' ? 'All Districts' : d}
            </option>
          ))}
        </select>
      </div>

      {/* Ward Alerts Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Ward Alerts — {filteredWards.length} wards
          </h3>
        </div>
        <div className="px-2 pb-4 space-y-0.5">
          {filteredWards.map((ward) => (
            <button
              key={ward.ward_no}
              onClick={() => handleWardClick(ward)}
              className={`w-full px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-left transition-all ${
                selectedWard === ward.ward_no
                  ? 'bg-accent/10 border border-accent/20'
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getAqiColor(ward.aqi) }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-200 truncate">{ward.ward_name}</p>
                <p className="text-[9px] text-gray-500">{ward.district}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono font-extrabold" style={{ color: getAqiColor(ward.aqi) }}>
                  {ward.aqi}
                </span>
                <p className="text-[8px] font-bold uppercase" style={{ color: getAqiColor(ward.aqi), opacity: 0.7 }}>
                  {getAqiCategory(ward.aqi)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(AdminSidebar);
