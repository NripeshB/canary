"""
Rule-based source detection model — calibrated for Delhi's pollutant profile.
Uses pollutant concentration ratios to classify dominant pollution sources.
Designed to mimic ML model output with a predict_sources() interface.

Key insight: Delhi has a naturally high PM10/PM2.5 ratio (~3-4x) due to ambient
road dust and arid conditions. The model must NOT treat this baseline as
construction activity. Construction is only flagged when ratio is extreme (>5)
AND PM10 is very high (>400).
"""


# Source definitions
SOURCES = {
    "vehicular": {
        "label": "Vehicular Emissions",
        "color": "#3b82f6",
        "key": "vehicular",
    },
    "construction": {
        "label": "Construction Dust",
        "color": "#f59e0b",
        "key": "construction",
    },
    "biomass": {
        "label": "Biomass Burning",
        "color": "#a855f7",
        "key": "biomass",
    },
    "industrial": {
        "label": "Industrial Emissions",
        "color": "#ef4444",
        "key": "industrial",
    },
    "atmospheric": {
        "label": "Atmospheric Stagnation",
        "color": "#0ea5e9",
        "key": "atmospheric",
    },
}


def predict_sources(pm25=None, pm10=None, no2=None, so2=None, co=None, o3=None, aqi=None):
    """
    Predict pollution source contribution percentages from pollutant concentrations.
    Calibrated for Delhi's specific pollutant profile.

    Returns list of dicts: [{source, key, pct, color}, ...] sorted descending by pct.
    """
    pm25 = pm25 or 0
    pm10 = pm10 or 0
    no2 = no2 or 0
    so2 = so2 or 0
    co = co or 0
    o3 = o3 or 0
    aqi = aqi or 0

    # If all pollutant data is zero/missing, use AQI-based fallback
    if pm25 == 0 and pm10 == 0 and no2 == 0 and so2 == 0 and co == 0:
        return _fallback_sources(aqi)

    scores = {}
    ratio = pm10 / pm25 if pm25 > 0 else 1.0

    # ─── VEHICULAR EMISSIONS ─────────────────────────────────────
    # Key markers: NO2 (from engine combustion) + CO (incomplete combustion)
    # Delhi typical NO2: 20-80 µg/m³, CO: 300-2000 µg/m³
    vehicular_score = 0
    if no2 > 30:
        vehicular_score += min(35, (no2 - 20) * 0.7)
    if co > 400:
        vehicular_score += min(25, (co - 300) / 40)
    if ratio < 3.0:
        vehicular_score += 10  # Lower ratio means more fine particles = combustion
    if no2 > 50 and co > 600:
        vehicular_score += 15  # Strong traffic signal
    scores["vehicular"] = min(85, vehicular_score)

    # ─── CONSTRUCTION DUST ───────────────────────────────────────
    # Key: EXTREME PM10/PM2.5 ratio (>5x) with very high absolute PM10
    # Delhi's baseline ratio is ~3-4x, so only flag outliers
    construction_score = 0
    if ratio > 6.0 and pm10 > 400:
        construction_score += 40
    elif ratio > 5.0 and pm10 > 350:
        construction_score += 25
    elif ratio > 4.5 and pm10 > 300:
        construction_score += 15
    # Extra: very high PM10 alone (>500)
    if pm10 > 500:
        construction_score += 15
    scores["construction"] = min(60, construction_score)

    # ─── BIOMASS BURNING ─────────────────────────────────────────
    # Key: High PM2.5 with moderate ratio (1.5-3x) + low industrial markers
    # Biomass produces lots of fine particles (PM2.5 dominant)
    biomass_score = 0
    if pm25 > 120:
        biomass_score += 30
    elif pm25 > 80:
        biomass_score += 20
    elif pm25 > 50:
        biomass_score += 10
    if ratio < 3.5 and pm25 > 60:
        biomass_score += 15  # PM2.5 dominant = organic combustion
    if so2 < 25 and no2 < 45:
        biomass_score += 12  # Low industrial/vehicular markers
    if co > 300 and no2 < 35:
        biomass_score += 10  # CO from burning but NOT traffic
    scores["biomass"] = min(75, biomass_score)

    # ─── INDUSTRIAL EMISSIONS ────────────────────────────────────
    # Key: SO2 (from coal/fuel combustion in factories) + elevated NO2
    # Delhi typical SO2: 5-30 µg/m³
    industrial_score = 0
    if so2 > 30:
        industrial_score += 35
    elif so2 > 20:
        industrial_score += 20
    elif so2 > 12:
        industrial_score += 10
    if no2 > 50 and so2 > 15:
        industrial_score += 15
    if so2 > 10 and pm25 > 100:
        industrial_score += 10
    scores["industrial"] = min(65, industrial_score)

    # ─── ATMOSPHERIC STAGNATION ──────────────────────────────────
    # Key: High AQI with uniformly elevated pollutants = trapped pollution
    # Also: high O3 indicates photochemical conditions + stagnation
    atmospheric_score = 0
    if aqi > 200:
        atmospheric_score += 15
    elif aqi > 150:
        atmospheric_score += 8
    if o3 > 60:
        atmospheric_score += 15
    elif o3 > 40:
        atmospheric_score += 8
    # If PM2.5 is high but NO2/SO2 are moderate — not one dominant source
    if pm25 > 60 and no2 < 50 and so2 < 25:
        atmospheric_score += 12
    # High ratio with moderate pollutants = ambient dust accumulation (stagnation)
    if ratio > 3.0 and pm10 < 400:
        atmospheric_score += 10
    scores["atmospheric"] = min(55, atmospheric_score)

    # ─── Normalize to percentages ────────────────────────────────
    total = sum(scores.values())
    if total == 0:
        return _fallback_sources(aqi)

    result = []
    for key in ["vehicular", "construction", "biomass", "industrial", "atmospheric"]:
        pct = round(scores[key] / total * 100)
        result.append({
            "source": SOURCES[key]["label"],
            "key": key,
            "pct": pct,
            "color": SOURCES[key]["color"],
        })

    result.sort(key=lambda x: x["pct"], reverse=True)

    # Fix rounding
    diff = 100 - sum(s["pct"] for s in result)
    if result:
        result[0]["pct"] += diff

    return result


def _fallback_sources(aqi):
    """Fallback source attribution when no pollutant data is available."""
    if aqi <= 100:
        weights = {"vehicular": 25, "construction": 15, "biomass": 10, "industrial": 10, "atmospheric": 40}
    elif aqi <= 200:
        weights = {"vehicular": 35, "construction": 10, "biomass": 20, "industrial": 15, "atmospheric": 20}
    elif aqi <= 300:
        weights = {"vehicular": 25, "construction": 10, "biomass": 30, "industrial": 20, "atmospheric": 15}
    else:
        weights = {"vehicular": 20, "construction": 5, "biomass": 35, "industrial": 20, "atmospheric": 20}

    result = []
    for key, pct in weights.items():
        result.append({
            "source": SOURCES[key]["label"],
            "key": key,
            "pct": pct,
            "color": SOURCES[key]["color"],
        })
    result.sort(key=lambda x: x["pct"], reverse=True)
    return result


def get_dominant_source(sources):
    """Extract dominant source info from prediction result."""
    if not sources:
        return "atmospheric", "#6b7280", "Atmospheric Stagnation", 0.3

    top = sources[0]
    return top["key"], top["color"], top["source"], top["pct"] / 100.0
