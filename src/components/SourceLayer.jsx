import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useAppState, useAppDispatch } from '../context/AppContext';
import { getAqiColor, getAqiCategory } from '../utils/aqiUtils';

/**
 * Source Detection Layer — colors wards by dominant pollution source.
 * Provides spatial intelligence showing WHERE different pollutant types dominate.
 */
function SourceLayer() {
  const { geojson, sourceMapData, wardList, selectedWard, hoveredWard, mapMode } = useAppState();
  const dispatch = useAppDispatch();
  const geoJsonRef = useRef(null);

  // Build source lookup
  const sourceLookup = useMemo(() => {
    const lookup = {};
    sourceMapData.forEach((w) => { lookup[w.ward_no] = w; });
    return lookup;
  }, [sourceMapData]);

  // Build ward lookup for AQI info in tooltips
  const wardLookup = useMemo(() => {
    const lookup = {};
    wardList.forEach((w) => { lookup[w.ward_no] = w; });
    return lookup;
  }, [wardList]);

  const getStyle = useCallback((feature) => {
    const wardNo = feature.properties?.Ward_No;
    const data = sourceLookup[wardNo];
    const isSelected = selectedWard === wardNo;
    const isHovered = hoveredWard === wardNo;
    const isDimmed = selectedWard !== null && !isSelected;
    const isCombined = mapMode === 'combined';

    if (!data) {
      return { fillColor: '#6b7280', fillOpacity: 0.1, weight: 0.3, color: '#334155', opacity: 0.3 };
    }

    const intensity = data.source_intensity || 0.3;

    return {
      fillColor: data.dominant_source_color || '#6b7280',
      fillOpacity: isDimmed ? 0.05 : isSelected ? 0.7 : isHovered ? 0.65 : isCombined ? intensity * 0.4 : intensity * 0.55,
      color: isSelected ? '#ffffff' : isHovered ? '#e2e8f0' : 'rgba(148, 163, 184, 0.12)',
      weight: isSelected ? 2.5 : isHovered ? 2 : 0.4,
      opacity: isDimmed ? 0.15 : 0.8,
    };
  }, [sourceLookup, selectedWard, hoveredWard, mapMode]);

  const onEachFeature = useCallback((feature, layer) => {
    const wardNo = feature.properties?.Ward_No;
    const wardName = feature.properties?.WardName || 'Unknown';
    const data = sourceLookup[wardNo];
    const ward = wardLookup[wardNo];
    const aqi = ward?.aqi || 0;
    const dominantSource = data?.dominant_source_label || 'Unknown';
    const sourceColor = data?.dominant_source_color || '#6b7280';
    const intensityPct = Math.round((data?.source_intensity || 0) * 100);

    layer.bindTooltip(
      `<div style="text-align:center;min-width:130px">
        <div style="font-weight:700;font-size:13px;margin-bottom:3px;letter-spacing:-0.01em">${wardName}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">
          <span style="font-size:18px;font-weight:800;color:${getAqiColor(aqi)}">${aqi}</span>
          <span style="font-size:10px;color:${getAqiColor(aqi)};background:${getAqiColor(aqi)}15;padding:1px 6px;border-radius:4px">${getAqiCategory(aqi)}</span>
        </div>
        <div style="font-size:10px;margin-bottom:2px">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${sourceColor};margin-right:4px;vertical-align:middle"></span>
          <span style="color:#e2e8f0;font-weight:600">${dominantSource}</span>
        </div>
        <div style="font-size:9px;color:#94a3b8">Intensity: ${intensityPct}%</div>
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
  }, [sourceLookup, wardLookup, dispatch]);

  // Re-style on changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (layer.feature) layer.setStyle(getStyle(layer.feature));
      });
    }
  }, [selectedWard, hoveredWard, getStyle]);

  const geoJsonKey = useMemo(() => `wards-source-${sourceMapData.length}`, [sourceMapData]);

  if (!geojson || sourceMapData.length === 0) return null;

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

export default React.memo(SourceLayer);

