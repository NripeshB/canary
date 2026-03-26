import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchReportMarkers } from '../api/wardApi';

/**
 * Report markers layer — shows citizen reports from last 24h as map pins.
 * Toggle-controlled from MapView.
 */

const CATEGORY_ICONS = {
  'Air Quality': '🌫️',
  'Burning': '🔥',
  'Construction': '🏗️',
  'Industrial': '🏭',
  'Traffic': '🚗',
  'Other': '📍',
};

const SEVERITY_COLORS = {
  1: '#22c55e',
  2: '#eab308',
  3: '#f97316',
  4: '#ef4444',
  5: '#dc2626',
};

function ReportMarkers({ visible }) {
  const map = useMap();
  const [reports, setReports] = useState([]);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    fetchReportMarkers().then(setReports).catch(() => setReports([]));
  }, [visible]);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!visible || reports.length === 0) return;

    const group = L.layerGroup();

    reports.forEach(r => {
      const icon = CATEGORY_ICONS[r.category] || '📍';
      const color = SEVERITY_COLORS[r.severity] || '#f97316';

      const markerIcon = L.divIcon({
        className: 'report-marker',
        html: `<div style="
          background: ${color};
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 0 12px ${color}80;
          border: 2px solid rgba(255,255,255,0.3);
          cursor: pointer;
        ">${icon}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([r.lat, r.lng], { icon: markerIcon });
      marker.bindPopup(`
        <div style="font-family: system-ui; min-width: 160px;">
          <strong style="font-size: 13px;">${r.category}</strong>
          <p style="font-size: 11px; color: #666; margin: 4px 0;">${r.description || 'No description'}</p>
          <div style="font-size: 10px; color: #999;">
            Severity: ${'●'.repeat(r.severity)}${'○'.repeat(5 - r.severity)} · ${r.hours_ago}h ago
          </div>
        </div>
      `);
      marker.addTo(group);
    });

    group.addTo(map);
    layerRef.current = group;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [visible, reports, map]);

  return null;
}

export default ReportMarkers;
