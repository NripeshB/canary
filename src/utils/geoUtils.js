import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import centroid from '@turf/centroid';

/**
 * Find which ward a given lat/lng falls within
 * @param {number} lat
 * @param {number} lng
 * @param {Object} geojson - FeatureCollection
 * @returns {Object|null} matching feature or null
 */
export function findWardByPoint(lat, lng, geojson) {
  if (!geojson || !geojson.features) return null;
  const pt = point([lng, lat]);
  for (const feature of geojson.features) {
    try {
      if (booleanPointInPolygon(pt, feature)) {
        return feature;
      }
    } catch (e) {
      // Skip invalid geometries
      continue;
    }
  }
  return null;
}

/**
 * Get the center point of a feature
 * @param {Object} feature - GeoJSON feature
 * @returns {[number, number]} [lat, lng]
 */
export function getWardCenter(feature) {
  try {
    const c = centroid(feature);
    return [c.geometry.coordinates[1], c.geometry.coordinates[0]];
  } catch {
    // Fallback: use first coordinate
    const coords = feature.geometry.coordinates;
    const ring = feature.geometry.type === 'MultiPolygon' ? coords[0][0] : coords[0];
    if (ring && ring.length > 0) {
      return [ring[0][1], ring[0][0]];
    }
    return [28.65, 77.22]; // Delhi center fallback
  }
}
