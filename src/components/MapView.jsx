import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import WardLayer from './WardLayer';
import SourceLayer from './SourceLayer';
import AqiLegend from './AqiLegend';
import MapModeToggle from './MapModeToggle';
import { useAppState } from '../context/AppContext';

function MapController() {
  const map = useMap();
  const { selectedFeature, selectedWard } = useAppState();
  const prevWardRef = useRef(null);

  useEffect(() => {
    if (selectedFeature && selectedWard !== prevWardRef.current) {
      prevWardRef.current = selectedWard;
      try {
        const layer = L.geoJSON(selectedFeature);
        const bounds = layer.getBounds();
        map.flyToBounds(bounds, {
          padding: [120, 120],
          duration: 1.0,
          maxZoom: 14,
        });
      } catch (e) {
        console.warn('Map fly-to failed:', e);
      }
    } else if (!selectedWard && prevWardRef.current !== null) {
      prevWardRef.current = null;
      map.flyTo([28.65, 77.22], 11, { duration: 0.8 });
    }
  }, [selectedFeature, selectedWard, map]);

  return null;
}

function MapView() {
  const { isLoading, geojson, mapMode } = useAppState();

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={[28.65, 77.22]}
        zoom={11}
        className="h-full w-full"
        zoomControl={true}
        attributionControl={true}
        minZoom={10}
        maxZoom={17}
        maxBounds={[[28.3, 76.8], [29.0, 77.6]]}
        maxBoundsViscosity={0.8}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
        />

        {!isLoading && geojson && (
          <>
            {(mapMode === 'aqi' || mapMode === 'combined') && (
              <WardLayer />
            )}
            {(mapMode === 'source' || mapMode === 'combined') && (
              <SourceLayer />
            )}
          </>
        )}

        <MapController />
        <AqiLegend />
        <MapModeToggle />
      </MapContainer>

      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface/90 backdrop-blur-md">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 border-2 border-accent/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-accent rounded-full animate-spin" />
              <div className="absolute inset-2 border-2 border-transparent border-t-accent/50 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-sm text-gray-300 font-medium">Initializing Command System</p>
            <p className="text-xs text-gray-500 mt-1">Loading ward intelligence data...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(MapView);
