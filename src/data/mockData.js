import { seededRandom } from '../utils/aqiUtils.js';

// ============================================================
// Deterministic AQI data generation (seeded by ward ID)
// ============================================================

/**
 * Generate AQI data for all wards from GeoJSON
 * Values are deterministic per ward_id for session consistency
 */
// 
export function generateWardAqiData(geojson) {
  const data = {};
  if (!geojson?.features) return data;

  geojson.features.forEach((feature) => {
    const wardNo = feature.properties?.Ward_No || feature.id;
    const wardName = feature.properties?.WardName || `Ward ${wardNo}`;
    const seed = (wardNo * 7 + 31) >>> 0;
    const rng = seededRandom(seed);

    // Base AQI between 40 and 420, weighted toward moderate-poor range
    const raw = rng() * 100;
    let aqi;
    if (raw < 5) aqi = Math.round(30 + rng() * 30);        // Good
    else if (raw < 20) aqi = Math.round(51 + rng() * 49);   // Satisfactory
    else if (raw < 50) aqi = Math.round(101 + rng() * 99);  // Moderate
    else if (raw < 80) aqi = Math.round(201 + rng() * 99);  // Poor
    else if (raw < 95) aqi = Math.round(301 + rng() * 99);  // Very Poor
    else aqi = Math.round(401 + rng() * 80);                // Severe

    // Prediction: current ± 10-30
    const delta = Math.round((rng() - 0.4) * 40);
    const predicted = Math.max(10, Math.min(500, aqi + delta));

    data[wardNo] = {
      wardNo,
      wardName,
      district: feature.properties?.AC_Name || 'Unknown',
      population: feature.properties?.TotalPop || 0,
      aqi,
      predicted,
      trend: delta > 5 ? 'rising' : delta < -5 ? 'falling' : 'stable',
    };
  });

  return data;
}

// ============================================================
// Source Attribution (rule-based by AQI tier)
// ============================================================

const SOURCE_PROFILES = {
  good: [
    { source: 'Background Pollution', pct: 40 },
    { source: 'Vehicular Emissions', pct: 25 },
    { source: 'Dust Resuspension', pct: 20 },
    { source: 'Biomass Burning', pct: 10 },
    { source: 'Industrial', pct: 5 },
  ],
  moderate: [
    { source: 'Vehicular Emissions', pct: 35 },
    { source: 'Construction Dust', pct: 25 },
    { source: 'Biomass Burning', pct: 15 },
    { source: 'Industrial Emissions', pct: 15 },
    { source: 'Atmospheric Stagnation', pct: 10 },
  ],
  poor: [
    { source: 'Vehicular Emissions', pct: 30 },
    { source: 'Biomass Burning', pct: 25 },
    { source: 'Construction Dust', pct: 20 },
    { source: 'Industrial Emissions', pct: 15 },
    { source: 'Atmospheric Stagnation', pct: 10 },
  ],
  severe: [
    { source: 'Biomass Burning', pct: 30 },
    { source: 'Vehicular Emissions', pct: 25 },
    { source: 'Atmospheric Stagnation', pct: 20 },
    { source: 'Industrial Emissions', pct: 15 },
    { source: 'Construction Dust', pct: 10 },
  ],
};

export function getSourceAttribution(aqi) {
  if (aqi <= 100) return SOURCE_PROFILES.good;
  if (aqi <= 200) return SOURCE_PROFILES.moderate;
  if (aqi <= 300) return SOURCE_PROFILES.poor;
  return SOURCE_PROFILES.severe;
}

// ============================================================
// Health Advisories
// ============================================================

const HEALTH_ADVISORIES = {
  good: {
    general: 'Air quality is satisfactory. Enjoy outdoor activities.',
    sensitive: 'No precautions needed for sensitive groups.',
  },
  moderate: {
    general: 'Air quality is acceptable. Limit prolonged outdoor exertion.',
    sensitive: 'People with respiratory issues should reduce outdoor activity.',
  },
  poor: {
    general: 'Reduce prolonged outdoor exertion. Use masks if outdoors.',
    sensitive: 'Avoid outdoor physical activity. Keep windows closed.',
  },
  severe: {
    general: 'Avoid all outdoor activities. Use N95 masks if going outside.',
    sensitive: 'Stay indoors. Use air purifiers. Seek medical attention if symptoms worsen.',
  },
};

export function getHealthAdvisory(aqi) {
  if (aqi <= 100) return HEALTH_ADVISORIES.good;
  if (aqi <= 200) return HEALTH_ADVISORIES.moderate;
  if (aqi <= 300) return HEALTH_ADVISORIES.poor;
  return HEALTH_ADVISORIES.severe;
}

// ============================================================
// Mitigation Recommendations
// ============================================================

const MITIGATIONS = {
  good: [
    { action: 'Routine Monitoring', icon: '📊', priority: 'low' },
    { action: 'Maintain Green Cover', icon: '🌳', priority: 'low' },
  ],
  moderate: [
    { action: 'Increase Road Water Sprinkling', icon: '💧', priority: 'medium' },
    { action: 'Monitor Construction Sites', icon: '🏗️', priority: 'medium' },
    { action: 'Deploy Mobile Monitoring', icon: '📡', priority: 'low' },
  ],
  poor: [
    { action: 'Enforce Traffic Diversions', icon: '🚦', priority: 'high' },
    { action: 'Halt Non-Essential Construction', icon: '🚧', priority: 'high' },
    { action: 'Activate Dust Suppression Units', icon: '💨', priority: 'high' },
    { action: 'Deploy Anti-Smog Guns', icon: '🔫', priority: 'medium' },
    { action: 'Increase Patrol Frequency', icon: '🚔', priority: 'medium' },
  ],
  severe: [
    { action: 'Implement Odd-Even Traffic Rule', icon: '🚗', priority: 'critical' },
    { action: 'Close All Construction Activity', icon: '⛔', priority: 'critical' },
    { action: 'Emergency Dust Suppression', icon: '🚨', priority: 'critical' },
    { action: 'Deploy Maximum Monitoring', icon: '📡', priority: 'critical' },
    { action: 'Issue Public Health Emergency', icon: '🏥', priority: 'critical' },
    { action: 'Coordinate with DPCC/EPA', icon: '📋', priority: 'high' },
  ],
};

export function getMitigations(aqi) {
  if (aqi <= 100) return MITIGATIONS.good;
  if (aqi <= 200) return MITIGATIONS.moderate;
  if (aqi <= 300) return MITIGATIONS.poor;
  return MITIGATIONS.severe;
}

// ============================================================
// Explainability Text
// ============================================================

export function getExplainability(aqi, wardName) {
  if (aqi <= 50) {
    return `${wardName} has good air quality. Favorable wind conditions are helping disperse pollutants effectively.`;
  }
  if (aqi <= 100) {
    return `${wardName} shows satisfactory air quality with minor contributions from vehicular emissions. Wind patterns are aiding pollutant dispersal.`;
  }
  if (aqi <= 200) {
    return `Moderate AQI in ${wardName} primarily due to vehicular emissions and construction activity. Low wind speeds are contributing to pollutant accumulation.`;
  }
  if (aqi <= 300) {
    return `Poor air quality in ${wardName} driven by heavy traffic congestion, nearby construction, and biomass burning. Atmospheric inversion is trapping pollutants.`;
  }
  if (aqi <= 400) {
    return `Very poor conditions in ${wardName}. Multiple pollution sources active — vehicular, industrial, and biomass burning. Near-stagnant wind conditions preventing dispersal.`;
  }
  return `Severe AQI alert for ${wardName}. Critical pollution levels from combined vehicular, industrial, and biomass sources. Complete atmospheric stagnation detected.`;
}

// ============================================================
// Mock Citizen Reports
// ============================================================

const REPORT_CATEGORIES = ['Garbage Burning', 'Construction Dust', 'Traffic Congestion', 'Industrial Smoke', 'Other'];
const DESCRIPTIONS = [
  'Heavy smoke visible from open waste burning near the main road.',
  'Construction debris being dumped without water sprinkling.',
  'Severe traffic jam causing visible exhaust haze.',
  'Factory chimney emitting dark smoke since morning.',
  'Unusual chemical smell in the area.',
  'Road dust not being controlled despite complaints.',
  'Biomass burning observed near residential area.',
  'Multiple vehicles idling at traffic signal for extended periods.',
];

export function generateMockReports(wardNo, count = 4) {
  const rng = seededRandom((wardNo * 13 + 7) >>> 0);
  const reports = [];
  for (let i = 0; i < count; i++) {
    const hoursAgo = Math.round(rng() * 72) + 1;
    reports.push({
      id: `report-${wardNo}-${i}`,
      category: REPORT_CATEGORIES[Math.floor(rng() * REPORT_CATEGORIES.length)],
      description: DESCRIPTIONS[Math.floor(rng() * DESCRIPTIONS.length)],
      severity: Math.ceil(rng() * 5),
      timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      hoursAgo,
    });
  }
  return reports.sort((a, b) => a.hoursAgo - b.hoursAgo);
}

// ============================================================
// District Grouping
// ============================================================

export function buildDistrictMap(geojson, aqiData) {
  const districts = {};
  if (!geojson?.features) return districts;

  geojson.features.forEach((feature) => {
    const districtName = feature.properties?.AC_Name || 'Unknown';
    const wardNo = feature.properties?.Ward_No || feature.id;
    const wardName = feature.properties?.WardName || `Ward ${wardNo}`;
    const aqiInfo = aqiData[wardNo];

    if (!districts[districtName]) {
      districts[districtName] = {
        name: districtName,
        wards: [],
        avgAqi: 0,
      };
    }

    districts[districtName].wards.push({
      wardNo,
      wardName,
      aqi: aqiInfo?.aqi || 0,
      population: feature.properties?.TotalPop || 0,
    });
  });

  // Calculate average AQI per district
  Object.values(districts).forEach((d) => {
    const sum = d.wards.reduce((acc, w) => acc + w.aqi, 0);
    d.avgAqi = Math.round(sum / d.wards.length);
    d.wards.sort((a, b) => a.wardName.localeCompare(b.wardName));
  });

  return districts;
}

export { REPORT_CATEGORIES };
