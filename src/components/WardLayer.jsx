import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiFillOpacity, getAqiCategory } from '../utils/aqiUtils';

function WardLayer() {
  const { geojson, wardList, selectedWard, hoveredWard, mapMode } = useAppState();
  const dispatch = useAppDispatch();
  const geoJsonRef = useRef(null);

  // Build ward lookup for fast access
  const wardLookup = useMemo(() => {
    const lookup = {};
    wardList.forEach((w) => { lookup[w.ward_no] = w; });
    return lookup;
  }, [wardList]);

  const getStyle = useCallback((feature) => {
    const wardNo = feature.properties?.Ward_No;
    const ward = wardLookup[wardNo];
    const aqi = ward?.aqi || 100;
    const isSelected = selectedWard === wardNo;
    const isHovered = hoveredWard === wardNo;
    const isDimmed = selectedWard !== null && !isSelected;
    const isCombined = mapMode === 'combined';

    return {
      fillColor: getAqiColor(aqi),
      fillOpacity: isDimmed ? 0.08 : isSelected ? 0.75 : isHovered ? 0.65 : isCombined ? getAqiFillOpacity(aqi) * 0.6 : getAqiFillOpacity(aqi),
      color: isSelected ? '#ffffff' : isHovered ? '#e2e8f0' : 'rgba(148, 163, 184, 0.2)',
      weight: isSelected ? 3 : isHovered ? 2 : 0.6,
      opacity: isDimmed ? 0.2 : 1,
    };
  }, [wardLookup, selectedWard, hoveredWard, mapMode]);

  const onEachFeature = useCallback((feature, layer) => {
    const wardNo = feature.properties?.Ward_No;
    const ward = wardLookup[wardNo];
    const wardName = feature.properties?.WardName || 'Unknown';
    const aqi = ward?.aqi || 0;
    const source = ward?.dominant_source || '';
    const trend = ward?.trend || 'stable';
    const trendIcon = trend === 'rising' ? '↗' : trend === 'falling' ? '↘' : '→';
    const trendColor = trend === 'rising' ? '#ef4444' : trend === 'falling' ? '#22c55e' : '#94a3b8';

    layer.bindTooltip(
      `<div style="text-align:center;min-width:120px">
        <div style="font-weight:700;font-size:13px;margin-bottom:3px;letter-spacing:-0.01em">${wardName}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:2px">
          <span style="font-size:18px;font-weight:800;color:${getAqiColor(aqi)}">${aqi}</span>
          <span style="font-size:10px;color:${getAqiColor(aqi)};background:${getAqiColor(aqi)}15;padding:1px 6px;border-radius:4px">${getAqiCategory(aqi)}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:4px">
          <span>${source.replace('_', ' ')}</span>
          <span style="color:${trendColor}">${trendIcon}</span>
        </div>
      </div>`,
      {
        className: 'ward-tooltip',
        direction: 'top',
        offset: [0, -10],
        sticky: false,
      }
    );

    layer.on({
      mouseover: (e) => {
        dispatch({ type: 'HOVER_WARD', payload: wardNo });
        e.target.bringToFront();
      },
      mouseout: () => {
        dispatch({ type: 'HOVER_WARD', payload: null });
      },
      click: () => {
        dispatch({ type: 'SELECT_WARD', payload: { wardNo, feature } });
      },
    });
  }, [wardLookup, dispatch]);

  // Re-style on selection/hover changes without full re-mount
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (layer.feature) {
          layer.setStyle(getStyle(layer.feature));
        }
      });
    }
  }, [selectedWard, hoveredWard, getStyle]);

  const geoJsonKey = useMemo(() => `wards-aqi-${wardList.length}`, [wardList]);

  if (!geojson) return null;

  return (
    <GeoJSON
      key={geoJsonKey}
      ref={geoJsonRef}
      data={geojson}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}

export default React.memo(WardLayer);
