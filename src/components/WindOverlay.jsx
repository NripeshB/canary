import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchWindData } from '../api/wardApi';

/**
 * Wind direction overlay — shows wind arrows on the map.
 * Toggle-controlled from MapView.
 */
function WindOverlay({ visible }) {
  const map = useMap();
  const [wind, setWind] = useState(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    fetchWindData().then(setWind).catch(() => setWind({ speed: 8, direction: 225, gusts: 15 }));
  }, [visible]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!visible || !wind) return;

    const group = L.layerGroup();
    const bounds = map.getBounds();
    const latStep = (bounds.getNorth() - bounds.getSouth()) / 5;
    const lngStep = (bounds.getEast() - bounds.getWest()) / 6;

    // Direction in CSS rotation (meteorological: where wind COMES FROM)
    const rotation = wind.direction;
    const speedLabel = `${Math.round(wind.speed)} km/h`;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 6; col++) {
        const lat = bounds.getSouth() + latStep * (row + 0.5);
        const lng = bounds.getWest() + lngStep * (col + 0.5);

        // Small variation per cell for visual interest
        const jitter = ((row * 7 + col * 13) % 20) - 10;

        const icon = L.divIcon({
          className: 'wind-arrow-icon',
          html: `<div style="
            transform: rotate(${rotation + jitter}deg);
            opacity: 0.5;
            font-size: 20px;
            color: #38bdf8;
            text-shadow: 0 0 8px rgba(56,189,248,0.4);
            pointer-events: none;
          ">↑</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        L.marker([lat, lng], { icon, interactive: false }).addTo(group);
      }
    }

    // Wind info box
    const infoIcon = L.divIcon({
      className: 'wind-info-box',
      html: `<div style="
        background: rgba(15,23,42,0.85);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(56,189,248,0.3);
        border-radius: 8px;
        padding: 6px 10px;
        color: #e2e8f0;
        font-size: 11px;
        white-space: nowrap;
        pointer-events: none;
      ">
        🌬️ ${speedLabel} · ${getWindDirection(wind.direction)} · Gusts ${Math.round(wind.gusts)} km/h
      </div>`,
      iconSize: [200, 30],
      iconAnchor: [100, 15],
    });
    L.marker([bounds.getNorth() - latStep * 0.3, (bounds.getEast() + bounds.getWest()) / 2], {
      icon: infoIcon,
      interactive: false,
    }).addTo(group);

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [visible, wind, map]);

  return null;
}

function getWindDirection(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export default WindOverlay;
