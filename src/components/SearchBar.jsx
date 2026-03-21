import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor } from '../utils/aqiUtils';
import { findWardByPoint } from '../utils/geoUtils';

function SearchBar() {
  const { geojson, wardList } = useAppState();
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Build searchable list
  const searchItems = useMemo(() => {
    if (!geojson?.features) return [];
    return geojson.features.map((f) => {
      const wardNo = f.properties?.Ward_No;
      const ward = wardList.find(w => w.ward_no === wardNo);
      return {
        wardNo,
        wardName: f.properties?.WardName || 'Unknown',
        district: f.properties?.AC_Name || '',
        aqi: ward?.aqi || 0,
        source: ward?.dominant_source || '',
        trend: ward?.trend || 'stable',
        feature: f,
      };
    }).sort((a, b) => a.wardName.localeCompare(b.wardName));
  }, [geojson, wardList]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 200);
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return searchItems.filter(
      (w) => w.wardName.toLowerCase().includes(q) || w.district.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [debouncedQuery, searchItems]);

  useEffect(() => {
    setIsOpen(filtered.length > 0 && query.trim().length > 0);
  }, [filtered, query]);

  const selectItem = useCallback((item) => {
    dispatch({ type: 'SELECT_WARD', payload: { wardNo: item.wardNo, feature: item.feature } });
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }, [dispatch]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectItem(filtered[activeIndex]); }
    else if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); }
  }, [isOpen, filtered, activeIndex, selectItem]);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (geojson) {
          const feature = findWardByPoint(pos.coords.latitude, pos.coords.longitude, geojson);
          if (feature) {
            dispatch({ type: 'SELECT_WARD', payload: { wardNo: feature.properties?.Ward_No, feature } });
          }
        }
      },
      (err) => console.warn('Geolocation error:', err)
    );
  }, [geojson, dispatch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trendIcon = (t) => t === 'rising' ? '↗' : t === 'falling' ? '↘' : '→';

  return (
    <div ref={dropdownRef} className="relative w-full max-w-sm">
      <div className="glass-panel-solid rounded-xl flex items-center gap-2.5 px-4 py-2.5 border border-white/[0.03]">
        <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (filtered.length > 0) setIsOpen(true); }}
          placeholder="Search wards or districts..."
          className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
        />
        <button
          onClick={handleLocateMe}
          className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-accent transition-colors"
          title="Locate me"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-panel-solid rounded-xl overflow-hidden shadow-2xl shadow-black/50 z-50 max-h-80 overflow-y-auto animate-fade-in border border-white/[0.05]">
          {filtered.map((item, i) => (
            <button
              key={item.wardNo}
              onClick={() => selectItem(item)}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                i === activeIndex ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
              } ${i > 0 ? 'border-t border-white/[0.03]' : ''}`}
            >
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getAqiColor(item.aqi) }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate">{item.wardName}</p>
                <p className="text-[10px] text-gray-500 truncate">{item.district} · {item.source}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-mono font-bold" style={{ color: getAqiColor(item.aqi) }}>{item.aqi}</span>
                <span className="text-xs ml-1" style={{ color: item.trend === 'rising' ? '#ef4444' : item.trend === 'falling' ? '#22c55e' : '#94a3b8' }}>
                  {trendIcon(item.trend)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default React.memo(SearchBar);
