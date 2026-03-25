import React, { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';
import { getMitigations } from '../data/mockData';

function PolicyRecommendations() {
  const { wardList, geojson } = useAppState();
  const dispatch = useAppDispatch();
  const barRef = useRef(null);

  // Get top 5 worst wards with their mitigations
  const worstWards = useMemo(() => {
    return [...wardList]
      .sort((a, b) => b.aqi - a.aqi)
      .slice(0, 5)
      .map(w => ({
        ...w,
        mitigations: getMitigations(w.aqi),
        category: getAqiCategory(w.aqi),
        color: getAqiColor(w.aqi),
      }));
  }, [wardList]);

  useEffect(() => {
    if (barRef.current && worstWards.length > 0) {
      gsap.fromTo(barRef.current,
        { y: '100%', opacity: 0 },
        { y: '0%', opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.5 }
      );
      const cards = barRef.current.querySelectorAll('.policy-card');
      gsap.fromTo(cards,
        { y: 15, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: 'power2.out', delay: 0.8 }
      );
    }
  }, [worstWards]);

  const handleWardClick = (ward) => {
    const feature = geojson?.features?.find(f => f.properties?.Ward_No === ward.ward_no);
    if (feature) {
      dispatch({ type: 'SELECT_WARD', payload: { wardNo: ward.ward_no, feature } });
    }
  };

  if (worstWards.length === 0) return null;

  return (
    <div
      ref={barRef}
      className="fixed bottom-0 left-[320px] right-0 z-15 translate-y-full"
    >
      <div className="glass-panel-solid border-t border-white/[0.05] px-5 py-3.5">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
            Automated Policy Recommendations — Priority Wards
          </h3>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 admin-scrollbar">
          {worstWards.map((ward) => (
            <button
              key={ward.ward_no}
              onClick={() => handleWardClick(ward)}
              className="policy-card flex-shrink-0 w-[260px] rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 text-left hover:bg-white/[0.04] hover:border-white/[0.1] transition-all group cursor-pointer"
            >
              {/* Ward header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: ward.color }}
                  />
                  <span className="text-xs font-bold text-gray-200 truncate max-w-[140px]">
                    {ward.ward_name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-mono font-extrabold" style={{ color: ward.color }}>
                    {ward.aqi}
                  </span>
                  <span
                    className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${ward.color}15`, color: ward.color }}
                  >
                    {ward.category}
                  </span>
                </div>
              </div>

              {/* Top 3 actions */}
              <div className="space-y-1">
                {ward.mitigations.slice(0, 3).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[10px]"
                  >
                    <span className="text-xs">{m.icon}</span>
                    <span className="text-gray-400 flex-1 truncate">{m.action}</span>
                    <span className={`text-[8px] font-bold uppercase opacity-60 priority-text-${m.priority}`}>
                      {m.priority}
                    </span>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PolicyRecommendations);
