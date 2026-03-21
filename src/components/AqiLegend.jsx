import React from 'react';
import { AQI_TIERS } from '../utils/aqiUtils';

function AqiLegend() {
  return (
    <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'auto' }}>
      <div className="leaflet-control glass-panel-solid rounded-lg p-3 ml-3 mb-3" style={{ minWidth: '140px' }}>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AQI Index</p>
        <div className="space-y-1">
          {AQI_TIERS.map((tier) => (
            <div key={tier.label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: tier.color }}
              />
              <span className="text-[10px] text-gray-300">{tier.label}</span>
              <span className="text-[10px] text-gray-500 ml-auto">≤{tier.max}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(AqiLegend);
