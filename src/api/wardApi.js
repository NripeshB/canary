/**
 * API client for the AQI Intelligence Platform backend.
 * All data fetching goes through these functions.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

/** GET /api/wards/ — All wards summary list */
export async function fetchWards() {
  const data = await apiFetch('/wards/');
  return data.wards;
}

/** GET /api/wards/<id>/ — Full ward detail */
export async function fetchWardDetail(wardNo) {
  return apiFetch(`/wards/${wardNo}/`);
}

/** GET /api/hotspots/ — Top pollution drivers */
export async function fetchHotspots(count = 5) {
  const data = await apiFetch(`/hotspots/?count=${count}`);
  return data.hotspots;
}

/** GET /api/city-trend/ — 12-month Delhi AQI trend */
export async function fetchCityTrend() {
  const data = await apiFetch('/city-trend/');
  return data.trend;
}

/** GET /api/city-source-map/ — Per-ward source intensity */
export async function fetchSourceMap() {
  const data = await apiFetch('/city-source-map/');
  return data.wards;
}

/** POST /api/reports/ — Submit citizen report */
export async function submitReport(reportData) {
  return apiFetch('/reports/', {
    method: 'POST',
    body: JSON.stringify(reportData),
  });
}

/** GET /api/reports/recent/ — Recent reports */
export async function fetchRecentReports(limit = 20) {
  const data = await apiFetch(`/reports/recent/?limit=${limit}`);
  return data.reports;
}

/** GET /api/wind/ — Current wind data */
export async function fetchWindData() {
  return apiFetch('/wind/');
}

/** GET /api/impact/ — Platform impact metrics */
export async function fetchImpactMetrics() {
  return apiFetch('/impact/');
}

/** GET /api/reports/map/ — Reports with coordinates for map markers */
export async function fetchReportMarkers() {
  const data = await apiFetch('/reports/map/');
  return data.reports;
}
