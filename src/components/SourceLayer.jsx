import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useAppState, useAppDispatch } from '../context/AppContext';

/**
 * Source Detection Layer — colors wards by dominant pollution source.
 * Provides spatial intelligence showing WHERE different pollutant types dominate.
 */
function SourceLayer() {
  const { geojson, sourceMapData, selectedWard, mapMode } = useAppState();
  const dispatch = useAppDispatch();
  const geoJsonRef = useRef(null);

  // Build source lookup
  const sourceLookup = useMemo(() => {
    const lookup = {};
    sourceMapData.forEach((w) => { lookup[w.ward_no] = w; });
    return lookup;
  }, [sourceMapData]);

  const getStyle = useCallback((feature) => {
    const wardNo = feature.properties?.Ward_No;
    const data = sourceLookup[wardNo];
    const isSelected = selectedWard === wardNo;
    const isDimmed = selectedWard !== null && !isSelected;
    const isCombined = mapMode === 'combined';

    if (!data) {
      return { fillColor: '#6b7280', fillOpacity: 0.1, weight: 0.3, color: '#334155', opacity: 0.3 };
    }

    const intensity = data.source_intensity || 0.3;

    return {
      fillColor: data.dominant_source_color || '#6b7280',
      fillOpacity: isDimmed ? 0.05 : isCombined ? intensity * 0.4 : intensity * 0.55,
      color: isSelected ? '#ffffff' : 'rgba(148, 163, 184, 0.12)',
      weight: isSelected ? 2.5 : 0.4,
      opacity: isDimmed ? 0.15 : 0.8,
    };
  }, [sourceLookup, selectedWard, mapMode]);

  // Re-style on changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.eachLayer((layer) => {
        if (layer.feature) layer.setStyle(getStyle(layer.feature));
      });
    }
  }, [selectedWard, getStyle]);

  const geoJsonKey = useMemo(() => `wards-source-${sourceMapData.length}`, [sourceMapData]);

  if (!geojson || sourceMapData.length === 0) return null;

  return (
    <GeoJSON
      key={geoJsonKey}
      ref={geoJsonRef}
      data={geojson}
      style={getStyle}
    />
  );
}

export default React.memo(SourceLayer);
