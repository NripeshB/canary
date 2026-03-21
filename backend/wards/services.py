"""
Seeded data generation service for all ward and city-level AQI data.
All business logic for AQI, source attribution, trends, advisories, and mitigations
lives here. This replaces the frontend mockData.js entirely.
"""

import json
import math
import os
import random
from functools import lru_cache
from pathlib import Path

# =============================================================================
# SEEDED PRNG — deterministic per ward
# =============================================================================

class SeededRandom:
    """Simple seeded PRNG for deterministic data generation."""
    def __init__(self, seed):
        self._state = seed & 0x7FFFFFFF
        if self._state == 0:
            self._state = 1

    def next(self):
        self._state = (self._state * 16807) % 2147483647
        return (self._state - 1) / 2147483646.0

    def randint(self, lo, hi):
        return lo + int(self.next() * (hi - lo + 1))

    def choice(self, lst):
        return lst[int(self.next() * len(lst))]


# =============================================================================
# AQI TIERS
# =============================================================================

AQI_TIERS = [
    {"max": 50,  "label": "Good",         "color": "#22c55e"},
    {"max": 100, "label": "Satisfactory",  "color": "#84cc16"},
    {"max": 200, "label": "Moderate",      "color": "#eab308"},
    {"max": 300, "label": "Poor",          "color": "#f97316"},
    {"max": 400, "label": "Very Poor",     "color": "#ef4444"},
    {"max": 500, "label": "Severe",        "color": "#991b1b"},
]

def get_aqi_tier(aqi):
    for t in AQI_TIERS:
        if aqi <= t["max"]:
            return t
    return AQI_TIERS[-1]


# =============================================================================
# SOURCE PROFILES (varied by ward seed to avoid uniformity)
# =============================================================================

SOURCE_KEYS = ["vehicular", "construction", "biomass", "industrial", "atmospheric"]
SOURCE_LABELS = {
    "vehicular": "Vehicular Emissions",
    "construction": "Construction Dust",
    "biomass": "Biomass Burning",
    "industrial": "Industrial Emissions",
    "atmospheric": "Atmospheric Stagnation",
}
SOURCE_COLORS = {
    "vehicular": "#3b82f6",      # electric blue
    "construction": "#f59e0b",   # amber
    "biomass": "#a855f7",        # purple
    "industrial": "#ef4444",     # red
    "atmospheric": "#6b7280",    # gray-green
}

def generate_source_attribution(rng, aqi):
    """Generate varied source weights per ward. NOT uniform across wards."""
    # Start with random base weights
    weights = {}
    total = 0
    for key in SOURCE_KEYS:
        w = rng.randint(5, 40)
        # Bias certain sources based on AQI severity
        if aqi > 300 and key == "biomass":
            w += rng.randint(10, 25)
        elif aqi > 200 and key == "vehicular":
            w += rng.randint(5, 20)
        elif aqi < 100 and key == "atmospheric":
            w += rng.randint(10, 20)
        elif key == "construction" and rng.next() > 0.6:
            w += rng.randint(10, 30)
        weights[key] = w
        total += w

    # Normalize to 100%
    result = []
    for key in SOURCE_KEYS:
        pct = round(weights[key] / total * 100)
        result.append({
            "source": SOURCE_LABELS[key],
            "key": key,
            "pct": pct,
            "color": SOURCE_COLORS[key],
        })

    # Sort descending
    result.sort(key=lambda x: x["pct"], reverse=True)

    # Fix rounding to sum to 100
    diff = 100 - sum(s["pct"] for s in result)
    if result:
        result[0]["pct"] += diff

    return result


# =============================================================================
# 24-HOUR AQI TREND — realistic diurnal pattern
# =============================================================================

def generate_24h_trend(rng, base_aqi):
    """Generate hourly AQI with realistic diurnal pattern."""
    # Morning rush (7-10), afternoon dip, evening rush (17-21), night calm
    diurnal = [
        0.85, 0.80, 0.78, 0.76, 0.75, 0.80,  # 0-5am  (low)
        0.90, 1.10, 1.20, 1.15, 1.05, 0.95,   # 6-11am (morning peak)
        0.90, 0.88, 0.85, 0.88, 0.95, 1.15,   # 12-5pm (afternoon)
        1.25, 1.30, 1.20, 1.10, 1.00, 0.92,   # 6-11pm (evening peak)
    ]
    trend = []
    for hour in range(24):
        noise = (rng.next() - 0.5) * 0.15  # ±7.5% noise
        val = max(10, min(500, round(base_aqi * (diurnal[hour] + noise))))
        trend.append({
            "hour": hour,
            "aqi": val,
            "label": f"{hour:02d}:00",
        })
    return trend


# =============================================================================
# 12-MONTH AQI TREND — seasonal pattern for Delhi
# =============================================================================

def generate_12m_trend(rng, base_aqi):
    """Generate monthly AQI with Delhi's seasonal pattern.
    Oct-Jan: worst (stubble burning + inversion)
    Apr-Jun: moderate-high (dust + heat)
    Jul-Sep: better (monsoon washout)
    """
    seasonal = [
        1.30, 1.15, 0.95, 0.85, 0.90, 0.80,   # Jan-Jun
        0.65, 0.60, 0.70, 1.10, 1.40, 1.35,    # Jul-Dec
    ]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = []
    for i, month in enumerate(months):
        noise = (rng.next() - 0.5) * 0.1
        val = max(20, min(500, round(base_aqi * (seasonal[i] + noise))))
        trend.append({
            "month": month,
            "aqi": val,
        })
    return trend


# =============================================================================
# CITY-WIDE 12-MONTH TREND
# =============================================================================

def generate_city_trend():
    """Aggregated Delhi city trend for last 12 months."""
    rng = SeededRandom(42)
    # Delhi avg AQI ~220 baseline
    base = 220
    seasonal = [
        1.30, 1.15, 0.95, 0.85, 0.90, 0.80,
        0.65, 0.60, 0.70, 1.10, 1.45, 1.35,
    ]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = []
    for i, month in enumerate(months):
        noise = (rng.next() - 0.5) * 0.08
        val = max(30, min(480, round(base * (seasonal[i] + noise))))
        tier = get_aqi_tier(val)
        trend.append({
            "month": month,
            "aqi": val,
            "category": tier["label"],
            "color": tier["color"],
        })
    return trend


# =============================================================================
# HEALTH ADVISORIES
# =============================================================================

HEALTH_ADVISORIES = {
    "Good": {
        "general": "Air quality is satisfactory. Enjoy outdoor activities.",
        "sensitive": "No precautions needed for sensitive groups.",
        "level": "low",
    },
    "Satisfactory": {
        "general": "Air quality is acceptable. Limit prolonged outdoor exertion.",
        "sensitive": "People with respiratory issues should monitor symptoms.",
        "level": "low",
    },
    "Moderate": {
        "general": "Reduce prolonged outdoor exertion. Use masks in heavy traffic areas.",
        "sensitive": "Avoid outdoor physical activity. Keep windows closed.",
        "level": "moderate",
    },
    "Poor": {
        "general": "Avoid prolonged outdoor exposure. Use N95 masks outdoors.",
        "sensitive": "Stay indoors. Use air purifiers. Seek medical attention if symptoms worsen.",
        "level": "high",
    },
    "Very Poor": {
        "general": "Avoid all outdoor activities. Use N95 masks if going outside.",
        "sensitive": "Stay indoors with air purifiers running. Seek immediate medical attention for any respiratory symptoms.",
        "level": "very_high",
    },
    "Severe": {
        "general": "Health emergency. Do not go outdoors. Seal windows and doors.",
        "sensitive": "Critical risk. Stay indoors at all times. Use air purifiers. Contact healthcare provider.",
        "level": "critical",
    },
}

def get_advisory(aqi_label):
    return HEALTH_ADVISORIES.get(aqi_label, HEALTH_ADVISORIES["Moderate"])


# =============================================================================
# MITIGATION RECOMMENDATIONS
# =============================================================================

MITIGATIONS = {
    "Good": [
        {"action": "Routine Monitoring", "icon": "📊", "priority": "low"},
        {"action": "Maintain Green Cover", "icon": "🌳", "priority": "low"},
    ],
    "Satisfactory": [
        {"action": "Routine Monitoring", "icon": "📊", "priority": "low"},
        {"action": "Monitor Construction Sites", "icon": "🏗️", "priority": "low"},
        {"action": "Maintain Green Cover", "icon": "🌳", "priority": "low"},
    ],
    "Moderate": [
        {"action": "Increase Road Water Sprinkling", "icon": "💧", "priority": "medium"},
        {"action": "Monitor Construction Sites", "icon": "🏗️", "priority": "medium"},
        {"action": "Deploy Mobile Monitoring", "icon": "📡", "priority": "low"},
    ],
    "Poor": [
        {"action": "Enforce Traffic Diversions", "icon": "🚦", "priority": "high"},
        {"action": "Halt Non-Essential Construction", "icon": "🚧", "priority": "high"},
        {"action": "Activate Dust Suppression Units", "icon": "💨", "priority": "high"},
        {"action": "Deploy Anti-Smog Guns", "icon": "🔫", "priority": "medium"},
        {"action": "Increase Patrol Frequency", "icon": "🚔", "priority": "medium"},
    ],
    "Very Poor": [
        {"action": "Implement Odd-Even Traffic Rule", "icon": "🚗", "priority": "critical"},
        {"action": "Close All Construction Activity", "icon": "⛔", "priority": "critical"},
        {"action": "Emergency Dust Suppression", "icon": "🚨", "priority": "critical"},
        {"action": "Deploy Maximum Monitoring", "icon": "📡", "priority": "critical"},
        {"action": "Issue Public Health Advisory", "icon": "🏥", "priority": "high"},
    ],
    "Severe": [
        {"action": "Implement Odd-Even Traffic Rule", "icon": "🚗", "priority": "critical"},
        {"action": "Close All Construction Activity", "icon": "⛔", "priority": "critical"},
        {"action": "Emergency Dust Suppression", "icon": "🚨", "priority": "critical"},
        {"action": "Maximum Monitoring + DPCC Coordination", "icon": "📡", "priority": "critical"},
        {"action": "Issue Public Health Emergency", "icon": "🏥", "priority": "critical"},
        {"action": "Coordinate with CPCB/EPA", "icon": "📋", "priority": "high"},
    ],
}

def get_mitigations(aqi_label):
    return MITIGATIONS.get(aqi_label, MITIGATIONS["Moderate"])


# =============================================================================
# EXPLAINABILITY
# =============================================================================

def get_explainability(aqi, ward_name, sources):
    dominant = sources[0]["source"] if sources else "unknown factors"
    secondary = sources[1]["source"] if len(sources) > 1 else ""

    if aqi <= 50:
        return f"{ward_name} has good air quality. Favorable wind conditions are dispersing pollutants effectively."
    elif aqi <= 100:
        return f"{ward_name} shows satisfactory air quality with minor contributions from {dominant.lower()}. Wind patterns are aiding dispersal."
    elif aqi <= 200:
        return f"Moderate AQI in {ward_name} primarily due to {dominant.lower()} ({sources[0]['pct']}%) and {secondary.lower()}. Low wind speeds are contributing to pollutant accumulation."
    elif aqi <= 300:
        return f"Poor air quality in {ward_name} driven by {dominant.lower()} ({sources[0]['pct']}%) combined with {secondary.lower()} ({sources[1]['pct']}%). Atmospheric inversion is trapping pollutants at ground level."
    elif aqi <= 400:
        return f"Very poor conditions in {ward_name}. {dominant} constitutes {sources[0]['pct']}% of pollution load. Near-stagnant wind conditions and temperature inversion preventing dispersal."
    else:
        return f"Severe AQI alert for {ward_name}. Critical pollution from {dominant.lower()} ({sources[0]['pct']}%) under complete atmospheric stagnation. Immediate intervention required."


# =============================================================================
# MOCK CITIZEN REPORTS
# =============================================================================

REPORT_CATEGORIES = ["Garbage Burning", "Construction Dust", "Traffic Congestion", "Industrial Smoke", "Other"]
REPORT_DESCRIPTIONS = [
    "Heavy smoke visible from open waste burning near the main road.",
    "Construction debris being dumped without water sprinkling.",
    "Severe traffic jam causing visible exhaust haze for hours.",
    "Factory chimney emitting dark smoke since morning.",
    "Unusual chemical smell in the residential area.",
    "Road dust not being controlled despite multiple complaints.",
    "Biomass burning observed near residential colony.",
    "Multiple vehicles idling at traffic signal for extended periods.",
    "Unauthorized construction generating heavy dust clouds.",
    "Waste burning at local dump site, affecting nearby homes.",
]

# In-memory store for user-submitted reports
_user_reports = []

def generate_mock_reports(ward_no, count=3):
    rng = SeededRandom((ward_no * 13 + 7) & 0x7FFFFFFF)
    reports = []
    for i in range(count):
        hours_ago = rng.randint(1, 72)
        reports.append({
            "id": f"mock-{ward_no}-{i}",
            "ward_no": ward_no,
            "category": rng.choice(REPORT_CATEGORIES),
            "description": rng.choice(REPORT_DESCRIPTIONS),
            "severity": rng.randint(1, 5),
            "hours_ago": hours_ago,
            "is_user_report": False,
        })
    reports.sort(key=lambda r: r["hours_ago"])
    return reports


def submit_report(data):
    """Submit a citizen report. Stored in-memory."""
    report = {
        "id": f"user-{len(_user_reports) + 1}",
        "ward_no": data.get("ward_id"),
        "category": data.get("category", "Other"),
        "description": data.get("description", ""),
        "severity": data.get("severity", 3),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "hours_ago": 0,
        "is_user_report": True,
    }
    _user_reports.insert(0, report)
    return report


def get_recent_reports(limit=20):
    """Get recent reports (user + mock) across all wards."""
    rng = SeededRandom(999)
    mock_global = []
    for ward_no in range(1, 50):
        if rng.next() > 0.6:
            mock_global.extend(generate_mock_reports(ward_no, count=1))
    mock_global.sort(key=lambda r: r["hours_ago"])
    all_reports = _user_reports + mock_global[:15]
    return all_reports[:limit]


# =============================================================================
# GEOJSON LOADER
# =============================================================================

@lru_cache(maxsize=1)
def load_geojson():
    """Load the Delhi wards GeoJSON file."""
    # Try multiple paths
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "public" / "delhiWards.json",
        Path(__file__).resolve().parent.parent.parent / "delhiWards.json",
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r") as f:
                return json.load(f)
    raise FileNotFoundError(f"delhiWards.json not found. Tried: {[str(p) for p in candidates]}")


# =============================================================================
# WARD DATA GENERATOR — all ward data computed from geojson + seed
# =============================================================================

@lru_cache(maxsize=1)
def get_all_wards_data():
    """Generate complete ward data for all wards. Cached for consistency."""
    geojson = load_geojson()
    wards = {}

    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        ward_no = props.get("Ward_No", 0)
        ward_name = props.get("WardName", f"Ward {ward_no}")
        district = props.get("AC_Name", "Unknown")
        population = props.get("TotalPop", 0)

        seed = (ward_no * 7 + 31) & 0x7FFFFFFF
        rng = SeededRandom(seed)

        # AQI generation with intentional spatial variation
        # Use ward_no to create clusters of different AQI levels
        cluster = (ward_no % 7)
        if cluster == 0:
            aqi = rng.randint(25, 60)       # Good pocket
        elif cluster == 1:
            aqi = rng.randint(55, 110)      # Satisfactory
        elif cluster in (2, 3):
            aqi = rng.randint(110, 220)     # Moderate
        elif cluster == 4:
            aqi = rng.randint(200, 320)     # Poor
        elif cluster == 5:
            aqi = rng.randint(290, 420)     # Very Poor
        else:
            aqi = rng.randint(380, 490)     # Severe

        # Add ward-specific secondary randomness
        aqi = max(15, min(500, aqi + rng.randint(-20, 20)))

        # Prediction
        delta = rng.randint(-30, 25)
        predicted = max(10, min(500, aqi + delta))
        if delta > 8:
            trend = "rising"
        elif delta < -8:
            trend = "falling"
        else:
            trend = "stable"

        # Source attribution (intentionally varied per ward)
        sources = generate_source_attribution(rng, aqi)
        dominant_source = sources[0]["key"]
        source_intensity = sources[0]["pct"] / 100.0

        # Get tier
        tier = get_aqi_tier(aqi)

        wards[ward_no] = {
            "ward_no": ward_no,
            "ward_name": ward_name,
            "district": district,
            "population": population,
            "aqi": aqi,
            "predicted": predicted,
            "trend": trend,
            "category": tier["label"],
            "color": tier["color"],
            "sources": sources,
            "dominant_source": dominant_source,
            "dominant_source_color": SOURCE_COLORS.get(dominant_source, "#6b7280"),
            "source_intensity": round(source_intensity, 2),
            "advisory": get_advisory(tier["label"]),
            "mitigations": get_mitigations(tier["label"]),
            "explainability": get_explainability(aqi, ward_name, sources),
            "report_count": rng.randint(0, 15),
        }

    return wards


def get_ward_summary_list():
    """Return ward summaries for listing."""
    wards = get_all_wards_data()
    return [
        {
            "ward_no": w["ward_no"],
            "ward_name": w["ward_name"],
            "district": w["district"],
            "aqi": w["aqi"],
            "category": w["category"],
            "color": w["color"],
            "dominant_source": w["dominant_source"],
            "dominant_source_color": w["dominant_source_color"],
            "population": w["population"],
            "trend": w["trend"],
        }
        for w in wards.values()
    ]


def get_ward_detail(ward_no):
    """Return full ward detail for a specific ward."""
    wards = get_all_wards_data()
    ward = wards.get(ward_no)
    if not ward:
        return None

    rng = SeededRandom((ward_no * 11 + 53) & 0x7FFFFFFF)

    # Generate detailed data
    detail = dict(ward)
    detail["trend_24h"] = generate_24h_trend(rng, ward["aqi"])
    detail["trend_12m"] = generate_12m_trend(rng, ward["aqi"])
    detail["reports"] = generate_mock_reports(ward_no, count=4)

    # Add user reports for this ward
    user_reps = [r for r in _user_reports if r["ward_no"] == ward_no]
    detail["reports"] = user_reps + detail["reports"]

    return detail


def get_hotspots(count=5):
    """Return top polluted wards as hotspot cards."""
    wards = get_all_wards_data()
    sorted_wards = sorted(wards.values(), key=lambda w: w["aqi"], reverse=True)
    hotspots = []
    for w in sorted_wards[:count]:
        hotspots.append({
            "ward_no": w["ward_no"],
            "ward_name": w["ward_name"],
            "district": w["district"],
            "aqi": w["aqi"],
            "category": w["category"],
            "color": w["color"],
            "dominant_source": w["dominant_source"],
            "dominant_source_label": SOURCE_LABELS.get(w["dominant_source"], "Unknown"),
            "dominant_source_color": w["dominant_source_color"],
            "source_intensity": w["source_intensity"],
            "population": w["population"],
        })
    return hotspots


def get_source_map():
    """Return per-ward source data for map layer rendering."""
    wards = get_all_wards_data()
    return [
        {
            "ward_no": w["ward_no"],
            "dominant_source": w["dominant_source"],
            "dominant_source_color": w["dominant_source_color"],
            "source_intensity": w["source_intensity"],
            "aqi": w["aqi"],
            "aqi_intensity": min(1.0, w["aqi"] / 400),
        }
        for w in wards.values()
    ]
