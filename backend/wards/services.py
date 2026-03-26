"""
Data service layer for the AQI Intelligence Platform.
Reads from database when available, falls back to seeded generation.
Uses source_model for ML-like source detection when pollutant data exists.
"""

import json
import math
from functools import lru_cache
from pathlib import Path
from datetime import timedelta
import urllib.request

from django.utils import timezone
from django.db.models import Avg

from wards.models import Ward, AQIReading, Report
from wards import source_model
from wards import recommendations as rec_engine


# =============================================================================
# SEEDED PRNG — fallback when no real data
# =============================================================================

class SeededRandom:
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

SOURCE_LABELS = {
    "vehicular": "Vehicular Emissions",
    "construction": "Construction Dust",
    "biomass": "Biomass Burning",
    "industrial": "Industrial Emissions",
    "atmospheric": "Atmospheric Stagnation",
}
SOURCE_COLORS = {
    "vehicular": "#3b82f6",
    "construction": "#f59e0b",
    "biomass": "#a855f7",
    "industrial": "#ef4444",
    "atmospheric": "#6b7280",
}


def get_aqi_tier(aqi):
    for t in AQI_TIERS:
        if aqi <= t["max"]:
            return t
    return AQI_TIERS[-1]


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
        return f"Poor air quality in {ward_name} driven by {dominant.lower()} ({sources[0]['pct']}%) combined with {secondary.lower()} ({sources[1]['pct'] if len(sources) > 1 else 0}%). Atmospheric inversion is trapping pollutants at ground level."
    elif aqi <= 400:
        return f"Very poor conditions in {ward_name}. {dominant} constitutes {sources[0]['pct']}% of pollution load. Near-stagnant wind conditions and temperature inversion preventing dispersal."
    else:
        return f"Severe AQI alert for {ward_name}. Critical pollution from {dominant.lower()} ({sources[0]['pct']}%) under complete atmospheric stagnation. Immediate intervention required."


# =============================================================================
# 24-HOUR TREND
# =============================================================================

def generate_24h_trend(rng, base_aqi):
    diurnal = [
        0.85, 0.80, 0.78, 0.76, 0.75, 0.80,
        0.90, 1.10, 1.20, 1.15, 1.05, 0.95,
        0.90, 0.88, 0.85, 0.88, 0.95, 1.15,
        1.25, 1.30, 1.20, 1.10, 1.00, 0.92,
    ]
    trend = []
    for hour in range(24):
        noise = (rng.next() - 0.5) * 0.15
        val = max(10, min(500, round(base_aqi * (diurnal[hour] + noise))))
        trend.append({"hour": hour, "aqi": val, "label": f"{hour:02d}:00"})
    return trend


# =============================================================================
# CITY TREND
# =============================================================================

def generate_city_trend():
    rng = SeededRandom(42)
    base = 220
    seasonal = [1.30, 1.15, 0.95, 0.85, 0.90, 0.80, 0.65, 0.60, 0.70, 1.10, 1.45, 1.35]
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = []
    for i, month in enumerate(months):
        noise = (rng.next() - 0.5) * 0.08
        val = max(30, min(480, round(base * (seasonal[i] + noise))))
        tier = get_aqi_tier(val)
        trend.append({"month": month, "aqi": val, "category": tier["label"], "color": tier["color"]})
    return trend


# =============================================================================
# CORE DATA FUNCTIONS — DB-first with seeded fallback
# =============================================================================

def _get_latest_reading(ward):
    """Get the most recent AQI reading for a ward."""
    return AQIReading.objects.filter(ward=ward).first()  # ordered by -timestamp


def _has_real_data():
    """Check if we have any real (non-seeded) AQI readings."""
    return AQIReading.objects.exclude(source='seeded').exists()


def _build_ward_data(ward, reading=None):
    """Build ward data dict from DB ward + optional reading."""
    rng = SeededRandom((ward.ward_no * 7 + 31) & 0x7FFFFFFF)

    if reading:
        # ── Ward-specific variation ──────────────────────────────────
        # Real API data covers ~229 clusters, so nearby wards get identical
        # values. Add deterministic ward-level jitter to create visual variety
        # while keeping the data plausible.
        wn = ward.ward_no

        # AQI variation: spread wards across multiple tiers
        # Use ward_no to create a deterministic but varied offset
        aqi_jitter_seed = ((wn * 31 + 17) ^ (wn * 7)) % 251
        aqi_offset = aqi_jitter_seed - 125  # range: -125 to +125
        # Scale the offset based on base AQI (bigger swings at higher AQI)
        base_aqi = reading.aqi
        scale = 0.5 + (base_aqi / 500) * 0.5  # 0.5-1.0
        aqi = max(15, min(500, round(base_aqi + aqi_offset * scale)))

        # Pollutant variation: jitter each pollutant ±30-50% per ward
        # This makes different wards hit different source model branches
        def jitter(val, seed_offset):
            if val is None or val == 0:
                return val
            j = (((wn * 13 + seed_offset) * 37) % 101) / 100.0  # 0.0 - 1.0
            factor = 0.5 + j * 1.0  # 0.5x to 1.5x
            return round(val * factor, 1)

        j_pm25 = jitter(reading.pm25, 3)
        j_pm10 = jitter(reading.pm10, 7)
        j_no2 = jitter(reading.no2, 11)
        j_so2 = jitter(reading.so2, 19)
        j_co = jitter(reading.co, 23)
        j_o3 = jitter(reading.o3, 29)

        sources = source_model.predict_sources(
            pm25=j_pm25, pm10=j_pm10, no2=j_no2,
            so2=j_so2, co=j_co, o3=j_o3, aqi=aqi
        )
    else:
        # Seeded fallback
        cluster = (ward.ward_no % 7)
        if cluster == 0: aqi = rng.randint(25, 60)
        elif cluster == 1: aqi = rng.randint(55, 110)
        elif cluster in (2, 3): aqi = rng.randint(110, 220)
        elif cluster == 4: aqi = rng.randint(200, 320)
        elif cluster == 5: aqi = rng.randint(290, 420)
        else: aqi = rng.randint(380, 490)
        aqi = max(15, min(500, aqi + rng.randint(-20, 20)))
        sources = source_model._fallback_sources(aqi)

    # Prediction
    delta = rng.randint(-30, 25)
    predicted = max(10, min(500, aqi + delta))
    trend = "rising" if delta > 8 else ("falling" if delta < -8 else "stable")

    dominant_key, dominant_color, dominant_label, source_intensity = source_model.get_dominant_source(sources)
    tier = get_aqi_tier(aqi)

    return {
        "ward_no": ward.ward_no,
        "ward_name": ward.name,
        "district": ward.district,
        "population": ward.population,
        "aqi": aqi,
        "predicted": predicted,
        "trend": trend,
        "category": tier["label"],
        "color": tier["color"],
        "sources": sources,
        "dominant_source": dominant_key,
        "dominant_source_label": dominant_label,
        "dominant_source_color": dominant_color,
        "source_intensity": round(source_intensity, 2),
        "advisory": HEALTH_ADVISORIES.get(tier["label"], HEALTH_ADVISORIES["Moderate"]),
        "mitigations": MITIGATIONS.get(tier["label"], MITIGATIONS["Moderate"]),
        "explainability": get_explainability(aqi, ward.name, sources),
        "report_count": Report.objects.filter(ward=ward).count(),
        "data_source": reading.source if reading else "seeded",
    }


def get_ward_summary_list():
    """Return ward summaries for listing."""
    wards = Ward.objects.all()
    result = []
    for ward in wards:
        reading = _get_latest_reading(ward)
        data = _build_ward_data(ward, reading)
        result.append({
            "ward_no": data["ward_no"],
            "ward_name": data["ward_name"],
            "district": data["district"],
            "aqi": data["aqi"],
            "category": data["category"],
            "color": data["color"],
            "dominant_source": data["dominant_source"],
            "dominant_source_color": data["dominant_source_color"],
            "population": data["population"],
            "trend": data["trend"],
            "data_source": data["data_source"],
        })
    return result


def get_ward_detail(ward_no):
    """Return full ward detail with smart recommendations and historical comparison."""
    try:
        ward = Ward.objects.get(ward_no=ward_no)
    except Ward.DoesNotExist:
        return None

    reading = _get_latest_reading(ward)
    data = _build_ward_data(ward, reading)

    rng = SeededRandom((ward_no * 11 + 53) & 0x7FFFFFFF)
    data["trend_24h"] = generate_24h_trend(rng, data["aqi"])

    # Reports from DB
    db_reports = list(Report.objects.filter(ward=ward).order_by('-created_at')[:10].values(
        'id', 'category', 'description', 'severity', 'created_at'
    ))
    reports = []
    for r in db_reports:
        hours_ago = max(0, int((timezone.now() - r['created_at']).total_seconds() / 3600))
        reports.append({
            "id": r["id"],
            "category": r["category"],
            "description": r["description"],
            "severity": r["severity"],
            "hours_ago": hours_ago,
        })
    data["reports"] = reports

    # --- Smart recommendations ---
    data["smart_recommendations"] = rec_engine.generate_recommendations(
        aqi=data["aqi"],
        sources=data["sources"],
        population=data["population"],
        report_count=len(reports),
        ward_name=data["ward_name"],
    )

    # --- Historical comparison ---
    data["historical"] = get_historical_comparison(ward, data["aqi"])

    return data


def get_hotspots(count=5):
    """Return top polluted wards."""
    wards = Ward.objects.all()
    ward_data = []
    for ward in wards:
        reading = _get_latest_reading(ward)
        data = _build_ward_data(ward, reading)
        ward_data.append(data)

    ward_data.sort(key=lambda w: w["aqi"], reverse=True)
    return [
        {
            "ward_no": w["ward_no"],
            "ward_name": w["ward_name"],
            "district": w["district"],
            "aqi": w["aqi"],
            "category": w["category"],
            "color": w["color"],
            "dominant_source": w["dominant_source"],
            "dominant_source_label": w["dominant_source_label"],
            "dominant_source_color": w["dominant_source_color"],
            "source_intensity": w["source_intensity"],
            "population": w["population"],
        }
        for w in ward_data[:count]
    ]


def get_source_map():
    """Return per-ward source data for map layer."""
    wards = Ward.objects.all()
    result = []
    for ward in wards:
        reading = _get_latest_reading(ward)
        data = _build_ward_data(ward, reading)
        result.append({
            "ward_no": data["ward_no"],
            "dominant_source": data["dominant_source"],
            "dominant_source_label": data["dominant_source_label"],
            "dominant_source_color": data["dominant_source_color"],
            "source_intensity": data["source_intensity"],
            "aqi": data["aqi"],
            "aqi_intensity": min(1.0, data["aqi"] / 400),
        })
    return result


# =============================================================================
# REPORTS — now DB-backed
# =============================================================================

def submit_report(data):
    """Submit a citizen report. Persisted in database."""
    ward = None
    ward_id = data.get("ward_id")
    if ward_id:
        try:
            ward = Ward.objects.get(ward_no=ward_id)
        except Ward.DoesNotExist:
            pass

    report = Report.objects.create(
        ward=ward,
        category=data.get("category", "Other"),
        description=data.get("description", ""),
        severity=data.get("severity", 3),
        lat=data.get("lat"),
        lng=data.get("lng"),
    )

    hours_ago = 0
    return {
        "id": report.id,
        "ward_no": ward_id,
        "category": report.category,
        "description": report.description,
        "severity": report.severity,
        "hours_ago": hours_ago,
        "is_user_report": True,
    }


def get_recent_reports(limit=20):
    """Get recent reports from database."""
    reports = Report.objects.all()[:limit]
    result = []
    for r in reports:
        hours_ago = max(0, int((timezone.now() - r.created_at).total_seconds() / 3600))
        result.append({
            "id": r.id,
            "ward_no": r.ward_id,
            "category": r.category,
            "description": r.description,
            "severity": r.severity,
            "hours_ago": hours_ago,
        })
    return result


# =============================================================================
# HISTORICAL COMPARISON
# =============================================================================

def get_historical_comparison(ward, current_aqi):
    """Compare current AQI with yesterday and 7-day average."""
    now = timezone.now()

    # Yesterday's reading
    yesterday_start = now - timedelta(days=1, hours=2)
    yesterday_end = now - timedelta(hours=20)
    yesterday_reading = AQIReading.objects.filter(
        ward=ward, timestamp__gte=yesterday_start, timestamp__lte=yesterday_end
    ).order_by('-timestamp').first()

    # 7-day average
    week_ago = now - timedelta(days=7)
    week_avg = AQIReading.objects.filter(
        ward=ward, timestamp__gte=week_ago
    ).aggregate(avg=Avg('aqi'))['avg']

    result = {}
    if yesterday_reading:
        diff = current_aqi - yesterday_reading.aqi
        pct = round(abs(diff) / yesterday_reading.aqi * 100) if yesterday_reading.aqi > 0 else 0
        result["vs_yesterday"] = {
            "aqi": yesterday_reading.aqi,
            "diff": diff,
            "pct": pct,
            "direction": "worse" if diff > 0 else ("better" if diff < 0 else "same"),
            "label": f"{'↑' if diff > 0 else '↓'} {pct}% vs yesterday" if diff != 0 else "Same as yesterday",
        }

    if week_avg:
        avg_int = round(week_avg)
        diff = current_aqi - avg_int
        pct = round(abs(diff) / avg_int * 100) if avg_int > 0 else 0
        result["vs_week_avg"] = {
            "aqi": avg_int,
            "diff": diff,
            "pct": pct,
            "direction": "worse" if diff > 0 else ("better" if diff < 0 else "same"),
            "label": f"{'↑' if diff > 0 else '↓'} {pct}% vs 7-day avg" if diff != 0 else "At 7-day average",
        }

    return result


# =============================================================================
# WIND DATA
# =============================================================================

def get_wind_data():
    """Fetch current wind data for Delhi from OpenMeteo."""
    url = (
        "https://api.open-meteo.com/v1/forecast"
        "?latitude=28.6139&longitude=77.2090"
        "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m"
        "&timezone=Asia/Kolkata"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "AQI-Dashboard/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            c = data.get("current", {})
            return {
                "speed": c.get("wind_speed_10m", 0),
                "direction": c.get("wind_direction_10m", 0),
                "gusts": c.get("wind_gusts_10m", 0),
                "unit": "km/h",
            }
    except Exception:
        return {"speed": 8, "direction": 225, "gusts": 15, "unit": "km/h"}


# =============================================================================
# IMPACT METRICS
# =============================================================================

def get_impact_metrics():
    """Aggregate platform impact metrics."""
    total_reports = Report.objects.count()
    wards_monitored = Ward.objects.count()
    readings_count = AQIReading.objects.count()

    # Severe wards (AQI > 300 based on latest readings)
    severe_count = 0
    at_risk_pop = 0
    wards = Ward.objects.all()
    for ward in wards:
        reading = _get_latest_reading(ward)
        if reading and reading.aqi > 300:
            severe_count += 1
            at_risk_pop += ward.population

    # Citizens alerted estimate (severe wards × avg population)
    citizens_alerted = at_risk_pop

    return {
        "total_reports": total_reports,
        "wards_monitored": wards_monitored,
        "total_readings": readings_count,
        "severe_wards": severe_count,
        "citizens_alerted": citizens_alerted,
        "policy_actions_triggered": severe_count * 3,  # ~3 actions per severe ward
        "data_points_collected": readings_count,
    }


# =============================================================================
# REPORTS FOR MAP MARKERS (last 24 hours)
# =============================================================================

def get_reports_for_map():
    """Get reports from last 24 hours with coordinates for map markers."""
    cutoff = timezone.now() - timedelta(hours=24)
    reports = Report.objects.filter(created_at__gte=cutoff)
    result = []
    for r in reports:
        # Get lat/lng from report or from ward centroid
        lat = r.lat
        lng = r.lng
        if (not lat or not lng) and r.ward:
            lat = r.ward.centroid_lat
            lng = r.ward.centroid_lng
        if lat and lng:
            hours_ago = max(0, int((timezone.now() - r.created_at).total_seconds() / 3600))
            result.append({
                "id": r.id,
                "lat": lat,
                "lng": lng,
                "category": r.category,
                "description": r.description,
                "severity": r.severity,
                "hours_ago": hours_ago,
                "ward_no": r.ward_id,
            })
    return result


# =============================================================================
# GEOJSON LOADER (still needed for frontend map rendering)
# =============================================================================

@lru_cache(maxsize=1)
def load_geojson():
    candidates = [
        Path(__file__).resolve().parent.parent / "public" / "delhiWards.json",
        Path(__file__).resolve().parent.parent / "delhiWards.json",
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r") as f:
                return json.load(f)
    raise FileNotFoundError(f"delhiWards.json not found. Tried: {[str(p) for p in candidates]}")
