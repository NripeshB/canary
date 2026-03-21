import React from 'react';
import { useAppState, useAppDispatch } from '../context/AppContext';

const MODES = [
  { key: 'aqi', label: 'AQI', icon: '🌡️' },
  { key: 'source', label: 'Sources', icon: '🔍' },
  { key: 'combined', label: 'Combined', icon: '📊' },
];

function MapModeToggle() {
  const { mapMode } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control glass-panel-solid rounded-xl p-1 mr-3 mt-3 flex gap-0.5">
        {MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => dispatch({ type: 'SET_MAP_MODE', payload: mode.key })}
            className={`px-3 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
              mapMode === mode.key
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <span className="text-xs">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(MapModeToggle);
