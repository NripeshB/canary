// Seeded pseudo-random number generator for deterministic AQI values
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// AQI color scale
const AQI_TIERS = [
  { max: 50, label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', textColor: '#22c55e' },
  { max: 100, label: 'Satisfactory', color: '#84cc16', bg: 'rgba(132,204,22,0.15)', textColor: '#84cc16' },
  { max: 200, label: 'Moderate', color: '#eab308', bg: 'rgba(234,179,8,0.15)', textColor: '#eab308' },
  { max: 300, label: 'Poor', color: '#f97316', bg: 'rgba(249,115,22,0.15)', textColor: '#f97316' },
  { max: 400, label: 'Very Poor', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', textColor: '#ef4444' },
  { max: 500, label: 'Severe', color: '#991b1b', bg: 'rgba(153,27,27,0.25)', textColor: '#fca5a5' },
];

export function getAqiTier(aqi) {
  return AQI_TIERS.find(t => aqi <= t.max) || AQI_TIERS[AQI_TIERS.length - 1];
}

export function getAqiColor(aqi) {
  return getAqiTier(aqi).color;
}

export function getAqiCategory(aqi) {
  return getAqiTier(aqi).label;
}

export function getAqiBg(aqi) {
  return getAqiTier(aqi).bg;
}

export function getAqiTextColor(aqi) {
  return getAqiTier(aqi).textColor;
}

export function getAqiFillColor(aqi) {
  const tier = getAqiTier(aqi);
  // Return slightly transparent version for map polygons
  const color = tier.color;
  return color;
}

export function getAqiFillOpacity(aqi) {
  if (aqi <= 50) return 0.35;
  if (aqi <= 100) return 0.4;
  if (aqi <= 200) return 0.5;
  if (aqi <= 300) return 0.55;
  if (aqi <= 400) return 0.65;
  return 0.75;
}

export { seededRandom, AQI_TIERS };
