import React, { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';
import TabSwitcher from './TabSwitcher';

function Header() {
  const { lastUpdated, wardList, selectedWard, hotspots } = useAppState();
  const dispatch = useAppDispatch();
  const titleRef = useRef(null);

  const totalWards = wardList.length;
  const avgAqi = totalWards > 0
    ? Math.round(wardList.reduce((s, w) => s + w.aqi, 0) / totalWards)
    : 0;

  const poorCount = wardList.filter(w => w.aqi > 200).length;
  const severeCount = wardList.filter(w => w.aqi > 300).length;

  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(titleRef.current,
        { y: -15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', delay: 0.3 }
      );
    }
  }, []);

  return (
    <div ref={titleRef} className="flex items-center gap-2.5">
      {/* District list toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_DISTRICT_LIST', payload: true })}
        className="p-2.5 rounded-xl glass-panel-solid hover:bg-white/5 text-gray-400 hover:text-gray-200 transition-all border border-white/[0.03] hover:border-white/[0.08]"
        title="Toggle district list"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Branding */}
      <div className="glass-panel-solid rounded-xl px-4 py-3 flex items-center gap-3 border border-white/[0.03]">
        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center border border-accent/20">
          <span className="text-base">🌫️</span>
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-gray-50 tracking-tight">Delhi AQI Command</h1>
          <div className="flex items-center gap-2 text-[9px] text-gray-500 mt-0.5">
            <span><strong className="text-gray-300">{totalWards}</strong> wards</span>
            <span className="text-gray-600">·</span>
            <span>Avg <strong style={{ color: getAqiColor(avgAqi) }}>{avgAqi}</strong></span>
            {lastUpdated && (
              <>
                <span className="text-gray-600">·</span>
                <span>Updated {new Date(lastUpdated).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <TabSwitcher />

      {/* Summary chips (visible on landing) */}
      {!selectedWard && (
        <div className="flex items-center gap-1.5 ml-1">
          {severeCount > 0 && (
            <div className="glass-panel-solid rounded-lg px-3 py-2 border border-red-500/20 text-[10px]">
              <span className="text-red-400 font-bold">{severeCount}</span>
              <span className="text-gray-500 ml-1">Severe+</span>
            </div>
          )}
          {poorCount > 0 && (
            <div className="glass-panel-solid rounded-lg px-3 py-2 border border-orange-500/15 text-[10px]">
              <span className="text-orange-400 font-bold">{poorCount}</span>
              <span className="text-gray-500 ml-1">Poor+</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(Header);
