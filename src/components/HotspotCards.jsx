import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor } from '../utils/aqiUtils';

const SOURCE_ICONS = {
  vehicular: '🚗',
  construction: '🏗️',
  biomass: '🔥',
  industrial: '🏭',
  atmospheric: '🌫️',
};

function HotspotCards() {
  const { hotspots, selectedWard, geojson } = useAppState();
  const dispatch = useAppDispatch();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || hotspots.length === 0) return;
    const cards = containerRef.current.querySelectorAll('.hotspot-card');
    gsap.fromTo(cards,
      { y: 30, opacity: 0, scale: 0.95 },
      { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', delay: 0.8 }
    );
  }, [hotspots]);

  const handleClick = (wardNo) => {
    const feature = geojson?.features?.find(f => f.properties?.Ward_No === wardNo);
    if (feature) {
      dispatch({ type: 'SELECT_WARD', payload: { wardNo, feature } });
    }
  };

  if (hotspots.length === 0 || selectedWard) return null;

  return (
    <div ref={containerRef} className="absolute top-20 right-4 z-10 w-[280px] space-y-2">
      <div className="px-1 mb-1">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
          🔴 Active Pollution Drivers
        </h3>
      </div>
      {hotspots.slice(0, 5).map((h) => (
        <button
          key={h.ward_no}
          onClick={() => handleClick(h.ward_no)}
          className="hotspot-card w-full glass-panel-solid rounded-xl p-3.5 text-left transition-all hover:bg-white/[0.04] hover:scale-[1.02] active:scale-[0.98] group cursor-pointer border border-white/[0.03] hover:border-white/[0.08]"
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: `${h.color}15` }}
            >
              {SOURCE_ICONS[h.dominant_source] || '📍'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xs font-bold text-gray-100 truncate">{h.ward_name}</p>
                <span
                  className="text-sm font-mono font-extrabold ml-2"
                  style={{ color: h.color }}
                >
                  {h.aqi}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-1.5">{h.district}</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${h.dominant_source_color}20`, color: h.dominant_source_color }}
                >
                  {h.dominant_source_label}
                </span>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${h.color}15`, color: h.color }}
                >
                  {h.category}
                </span>
              </div>
            </div>
          </div>
          {/* Intensity bar */}
          <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, h.source_intensity * 100)}%`, backgroundColor: h.dominant_source_color }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}

export default React.memo(HotspotCards);
