import React, { useEffect, useRef, useMemo, useState } from 'react';
import gsap from 'gsap';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';

function DistrictList() {
  const { geojson, wardList, isDistrictListOpen, selectedWard } = useAppState();
  const dispatch = useAppDispatch();
  const panelRef = useRef(null);
  const cardsRef = useRef(null);
  const [expandedDistrict, setExpandedDistrict] = useState(null);

  // Build district grouping from wardList
  const sortedDistricts = useMemo(() => {
    const districts = {};
    wardList.forEach((w) => {
      const name = w.district || 'Unknown';
      if (!districts[name]) {
        districts[name] = { name, wards: [], avgAqi: 0 };
      }
      districts[name].wards.push(w);
    });
    Object.values(districts).forEach((d) => {
      d.avgAqi = Math.round(d.wards.reduce((s, w) => s + w.aqi, 0) / d.wards.length);
      d.wards.sort((a, b) => a.ward_name.localeCompare(b.ward_name));
    });
    return Object.values(districts).sort((a, b) => a.name.localeCompare(b.name));
  }, [wardList]);

  useEffect(() => {
    if (!panelRef.current) return;
    if (isDistrictListOpen) {
      gsap.fromTo(panelRef.current, { x: '-100%', opacity: 0 }, { x: '0%', opacity: 1, duration: 0.4, ease: 'power3.out' });
    } else {
      gsap.to(panelRef.current, { x: '-100%', opacity: 0, duration: 0.3, ease: 'power2.in' });
    }
  }, [isDistrictListOpen]);

  useEffect(() => {
    if (cardsRef.current && expandedDistrict) {
      const cards = cardsRef.current.querySelectorAll('.ward-card');
      gsap.fromTo(cards, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.04, ease: 'power2.out' });
    }
  }, [expandedDistrict]);

  const handleWardClick = (ward) => {
    const feature = geojson?.features?.find(f => f.properties?.Ward_No === ward.ward_no);
    if (feature) {
      dispatch({ type: 'SELECT_WARD', payload: { wardNo: ward.ward_no, feature } });
    }
  };

  return (
    <div ref={panelRef} className="fixed left-0 top-0 h-full w-[300px] z-20 glass-panel-solid shadow-2xl shadow-black/60 flex flex-col -translate-x-full">
      <div className="px-4 pt-5 pb-3 border-b border-white/[0.05] flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-gray-50">Districts & Wards</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">{sortedDistricts.length} districts · {wardList.length} wards</p>
          </div>
          <button onClick={() => dispatch({ type: 'TOGGLE_DISTRICT_LIST', payload: false })} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {sortedDistricts.map((district) => (
          <div key={district.name} className="border-b border-white/[0.03]">
            <button
              onClick={() => setExpandedDistrict(expandedDistrict === district.name ? null : district.name)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors text-left"
            >
              <svg className={`w-3 h-3 text-gray-500 transition-transform ${expandedDistrict === district.name ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-200 truncate">{district.name}</p>
                <p className="text-[10px] text-gray-500">{district.wards.length} wards</p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold"
                style={{ backgroundColor: `${getAqiColor(district.avgAqi)}15`, color: getAqiColor(district.avgAqi) }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getAqiColor(district.avgAqi) }} />
                {district.avgAqi}
              </div>
            </button>

            {expandedDistrict === district.name && (
              <div ref={cardsRef} className="pb-2 px-2">
                {district.wards.map((ward) => (
                  <button
                    key={ward.ward_no}
                    onClick={() => handleWardClick(ward)}
                    className={`ward-card w-full px-3 py-2.5 mb-1 rounded-lg flex items-center gap-2.5 text-left transition-all ${
                      selectedWard === ward.ward_no ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getAqiColor(ward.aqi) }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-300 truncate">{ward.ward_name}</p>
                      <p className="text-[10px] text-gray-500">Pop: {(ward.population || 0).toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: getAqiColor(ward.aqi) }}>{ward.aqi}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(DistrictList);
