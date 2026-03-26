"""
Smart Recommendation Engine for the AQI Platform.
Generates context-aware, source-specific, severity-escalated policy recommendations.

Factors considered:
- Dominant pollution source (from source_model)
- AQI severity level (4 tiers)
- Population at risk
- Number of citizen reports (crowdsourced intelligence)
- Multi-source compound situations
- Time of day
- Assigned responsible department
- Estimated impact & cost
"""

from datetime import datetime


# ═══════════════════════════════════════════════════════════════
# SOURCE-SPECIFIC ACTION LIBRARIES
# ═══════════════════════════════════════════════════════════════

VEHICULAR_ACTIONS = {
    "monitor": [
        {"action": "Increase traffic monitoring at key junctions", "icon": "📡", "dept": "Traffic Police", "impact": 5, "cost": "low"},
        {"action": "Deploy real-time vehicle emission sensors", "icon": "🔬", "dept": "DPCC", "impact": 8, "cost": "medium"},
    ],
    "moderate": [
        {"action": "Reroute heavy commercial vehicles via bypass roads", "icon": "🚛", "dept": "Traffic Police", "impact": 15, "cost": "low"},
        {"action": "Increase frequency of public bus services", "icon": "🚌", "dept": "DTC", "impact": 10, "cost": "medium"},
        {"action": "Activate congestion pricing in hotspot zones", "icon": "💰", "dept": "Municipal Corp", "impact": 12, "cost": "low"},
    ],
    "enforce": [
        {"action": "Implement Odd-Even vehicle rationing", "icon": "🚗", "dept": "Traffic Police", "impact": 25, "cost": "low"},
        {"action": "Ban entry of non-BS6 vehicles in ward", "icon": "⛔", "dept": "RTO", "impact": 20, "cost": "low"},
        {"action": "Deploy traffic marshals at top 10 congestion points", "icon": "👮", "dept": "Traffic Police", "impact": 15, "cost": "medium"},
        {"action": "Mandate carpooling for commercial establishments", "icon": "🤝", "dept": "District Admin", "impact": 10, "cost": "low"},
    ],
    "emergency": [
        {"action": "Complete ban on private vehicles except EVs", "icon": "🚫", "dept": "DC Office", "impact": 40, "cost": "high"},
        {"action": "Free metro/bus rides to reduce road traffic", "icon": "🎫", "dept": "DTC / DMRC", "impact": 30, "cost": "high"},
        {"action": "Shut down petrol pumps between 6 AM - 10 PM", "icon": "⛽", "dept": "SDM", "impact": 20, "cost": "high"},
    ],
}

BIOMASS_ACTIONS = {
    "monitor": [
        {"action": "Deploy drone surveillance for open burning", "icon": "🛸", "dept": "DPCC", "impact": 10, "cost": "medium"},
        {"action": "Activate smoke detection sensors in residential areas", "icon": "📡", "dept": "Fire Dept", "impact": 8, "cost": "medium"},
    ],
    "moderate": [
        {"action": "Issue ward-level burning ban with SMS alerts", "icon": "📱", "dept": "District Admin", "impact": 15, "cost": "low"},
        {"action": "Deploy biomass collection drives (door-to-door)", "icon": "♻️", "dept": "Municipal Corp", "impact": 20, "cost": "medium"},
        {"action": "Setup temporary biomass drop-off points", "icon": "📦", "dept": "Municipal Corp", "impact": 12, "cost": "medium"},
    ],
    "enforce": [
        {"action": "Impose ₹5,000 fine for open burning violations", "icon": "💸", "dept": "SDM", "impact": 25, "cost": "low"},
        {"action": "Deploy ground patrol teams in residential zones", "icon": "🚔", "dept": "Police", "impact": 20, "cost": "medium"},
        {"action": "Shut down illegal waste burning sites", "icon": "🚧", "dept": "DPCC", "impact": 30, "cost": "medium"},
        {"action": "Distribute free LPG connections to low-income areas", "icon": "🔥", "dept": "Social Welfare", "impact": 15, "cost": "high"},
    ],
    "emergency": [
        {"action": "Deploy fire brigade units for immediate dousing", "icon": "🚒", "dept": "Fire Dept", "impact": 35, "cost": "high"},
        {"action": "Evacuate sensitive areas (schools, hospitals within 1 km)", "icon": "🏥", "dept": "District Admin", "impact": 25, "cost": "high"},
        {"action": "Activate National Disaster Response standby", "icon": "🆘", "dept": "NDRF", "impact": 15, "cost": "high"},
    ],
}

INDUSTRIAL_ACTIONS = {
    "monitor": [
        {"action": "Schedule emission audits for factories in ward", "icon": "📋", "dept": "DPCC", "impact": 10, "cost": "low"},
        {"action": "Install continuous emission monitoring at stacks", "icon": "📊", "dept": "DPCC", "impact": 12, "cost": "medium"},
    ],
    "moderate": [
        {"action": "Mandate pollution control certificate renewal", "icon": "📄", "dept": "DPCC", "impact": 15, "cost": "low"},
        {"action": "Enforce minimum stack height compliance", "icon": "🏭", "dept": "DPCC", "impact": 18, "cost": "medium"},
        {"action": "Restrict industrial operations to off-peak hours", "icon": "⏰", "dept": "District Admin", "impact": 20, "cost": "medium"},
    ],
    "enforce": [
        {"action": "Seal non-compliant industrial units", "icon": "🔒", "dept": "SDM", "impact": 35, "cost": "low"},
        {"action": "Impose ₹50,000 fine per emission violation", "icon": "💸", "dept": "DPCC", "impact": 25, "cost": "low"},
        {"action": "Mandate switch to natural gas / cleaner fuel", "icon": "🔄", "dept": "DPCC", "impact": 30, "cost": "high"},
        {"action": "Deploy mobile emission testing vans near factories", "icon": "🚐", "dept": "DPCC", "impact": 15, "cost": "medium"},
    ],
    "emergency": [
        {"action": "Immediate shutdown of all polluting industrial units", "icon": "⛔", "dept": "DC Office", "impact": 50, "cost": "high"},
        {"action": "Coordinate with CPCB for national-level enforcement", "icon": "📞", "dept": "CPCB", "impact": 20, "cost": "low"},
        {"action": "File FIRs against repeat offender industries", "icon": "⚖️", "dept": "Police", "impact": 15, "cost": "low"},
    ],
}

CONSTRUCTION_ACTIONS = {
    "monitor": [
        {"action": "Inspect construction sites for dust control", "icon": "🔍", "dept": "Municipal Corp", "impact": 10, "cost": "low"},
        {"action": "Verify anti-smog net installations at sites", "icon": "🕸️", "dept": "Municipal Corp", "impact": 8, "cost": "low"},
    ],
    "moderate": [
        {"action": "Mandate water sprinkling every 2 hours at sites", "icon": "💧", "dept": "Municipal Corp", "impact": 20, "cost": "low"},
        {"action": "Deploy mechanical road sweepers on arterial roads", "icon": "🧹", "dept": "PWD", "impact": 15, "cost": "medium"},
        {"action": "Enforce covered transportation of construction material", "icon": "🚚", "dept": "Traffic Police", "impact": 12, "cost": "low"},
    ],
    "enforce": [
        {"action": "Halt all non-essential construction activity", "icon": "🚧", "dept": "SDM", "impact": 35, "cost": "medium"},
        {"action": "Impose ₹10,000 fine for uncovered material transport", "icon": "💸", "dept": "Traffic Police", "impact": 20, "cost": "low"},
        {"action": "Mandate dust barrier walls at all active sites", "icon": "🧱", "dept": "Municipal Corp", "impact": 25, "cost": "medium"},
        {"action": "Activate anti-smog guns at construction hotspots", "icon": "🔫", "dept": "Municipal Corp", "impact": 18, "cost": "medium"},
    ],
    "emergency": [
        {"action": "Complete ban on all construction and demolition", "icon": "⛔", "dept": "DC Office", "impact": 45, "cost": "high"},
        {"action": "Deploy water tankers for continuous road washing", "icon": "🚰", "dept": "DJB", "impact": 20, "cost": "high"},
        {"action": "Emergency sealing of violating construction sites", "icon": "🔒", "dept": "SDM", "impact": 30, "cost": "low"},
    ],
}

ATMOSPHERIC_ACTIONS = {
    "monitor": [
        {"action": "Activate additional air quality monitoring stations", "icon": "📡", "dept": "DPCC", "impact": 5, "cost": "medium"},
        {"action": "Issue weather advisory for atmospheric stagnation", "icon": "🌤️", "dept": "IMD", "impact": 8, "cost": "low"},
    ],
    "moderate": [
        {"action": "Deploy anti-smog gun network across ward", "icon": "🔫", "dept": "Municipal Corp", "impact": 15, "cost": "medium"},
        {"action": "Activate green belt watering for dust suppression", "icon": "🌳", "dept": "DDA", "impact": 10, "cost": "low"},
        {"action": "Issue school outdoor activity advisory", "icon": "🏫", "dept": "Education Dept", "impact": 12, "cost": "low"},
    ],
    "enforce": [
        {"action": "Coordinate artificial rain with IMD", "icon": "🌧️", "dept": "IMD / IAF", "impact": 30, "cost": "high"},
        {"action": "Mandate indoor gym for construction workers", "icon": "🏋️", "dept": "Labour Dept", "impact": 10, "cost": "medium"},
        {"action": "Deploy maximum smog towers and misting systems", "icon": "🗼", "dept": "Municipal Corp", "impact": 20, "cost": "high"},
        {"action": "Issue public health advisory via all channels", "icon": "📢", "dept": "Health Dept", "impact": 15, "cost": "low"},
    ],
    "emergency": [
        {"action": "Declare public health emergency for ward", "icon": "🆘", "dept": "DC Office", "impact": 25, "cost": "high"},
        {"action": "Close all schools and non-essential offices", "icon": "🏫", "dept": "District Admin", "impact": 20, "cost": "high"},
        {"action": "Set up emergency medical camps in ward", "icon": "🏥", "dept": "Health Dept", "impact": 15, "cost": "high"},
        {"action": "Distribute N95 masks to all residents", "icon": "😷", "dept": "Social Welfare", "impact": 10, "cost": "high"},
    ],
}

SOURCE_ACTION_MAP = {
    "vehicular": VEHICULAR_ACTIONS,
    "biomass": BIOMASS_ACTIONS,
    "industrial": INDUSTRIAL_ACTIONS,
    "construction": CONSTRUCTION_ACTIONS,
    "atmospheric": ATMOSPHERIC_ACTIONS,
}


# ═══════════════════════════════════════════════════════════════
# COMPOUND SITUATION ACTIONS  
# Multi-source combinations trigger additional cross-cutting measures
# ═══════════════════════════════════════════════════════════════

COMPOUND_ACTIONS = {
    ("vehicular", "industrial"): {
        "action": "Coordinate GRAP Stage-III: Combined traffic + industrial curbs",
        "icon": "🔗", "dept": "CAQM / DPCC", "impact": 35, "cost": "high",
        "trigger": "When vehicular + industrial each > 25%",
    },
    ("biomass", "atmospheric"): {
        "action": "Deploy emergency air purification units in affected ward",
        "icon": "🌀", "dept": "DPCC", "impact": 20, "cost": "high",
        "trigger": "When burning smoke is trapped by stagnant atmosphere",
    },
    ("vehicular", "construction"): {
        "action": "Restrict all diesel vehicles + halt construction near hospitals/schools",
        "icon": "🏥", "dept": "SDM", "impact": 30, "cost": "medium",
        "trigger": "When dust and exhaust compound near sensitive zones",
    },
    ("industrial", "atmospheric"): {
        "action": "Emergency factory shutdown + activate GRAP Stage-IV protocols",
        "icon": "🏭", "dept": "CPCB", "impact": 40, "cost": "high",
        "trigger": "When industrial emissions are trapped at ground level",
    },
}


# ═══════════════════════════════════════════════════════════════
# CORE ENGINE
# ═══════════════════════════════════════════════════════════════

def _get_severity_tier(aqi):
    """Map AQI to severity tier for recommendation escalation."""
    if aqi <= 100:
        return "monitor"
    elif aqi <= 200:
        return "moderate"
    elif aqi <= 300:
        return "enforce"
    else:
        return "emergency"


def _get_urgency_score(aqi, population, report_count):
    """Calculate urgency 0-100 based on multiple factors."""
    aqi_weight = min(40, (aqi / 500) * 40)
    pop_weight = min(30, (population / 100000) * 30)
    report_weight = min(30, report_count * 5)
    return round(aqi_weight + pop_weight + report_weight)


def generate_recommendations(aqi, sources, population=0, report_count=0, ward_name=""):
    """
    Generate smart, context-aware recommendations.
    
    Returns dict with:
    - primary_actions: source-specific actions for dominant source
    - secondary_actions: actions for second source if significant
    - compound_actions: cross-cutting measures for multi-source situations
    - urgency: 0-100 score
    - severity_tier: monitor/moderate/enforce/emergency
    - summary: human-readable explanation
    - estimated_aqi_reduction: projected AQI drop if actions implemented
    """
    severity = _get_severity_tier(aqi)
    urgency = _get_urgency_score(aqi, population, report_count)

    # Get top 2 sources
    dominant = sources[0] if sources else {"key": "atmospheric", "pct": 50}
    secondary = sources[1] if len(sources) > 1 else None

    # --- Primary actions (from dominant source) ---
    source_lib = SOURCE_ACTION_MAP.get(dominant["key"], ATMOSPHERIC_ACTIONS)
    primary_actions = list(source_lib.get(severity, source_lib["monitor"]))
    
    # Add urgency boost: if urgency > 70, also pull from next severity tier
    if urgency > 70 and severity != "emergency":
        tiers = ["monitor", "moderate", "enforce", "emergency"]
        next_tier = tiers[tiers.index(severity) + 1]
        boost = source_lib.get(next_tier, [])
        if boost:
            primary_actions.append(boost[0])  # Add top action from next tier

    # Tag each action
    for a in primary_actions:
        a["source"] = dominant["key"]
        a["source_label"] = dominant.get("source", dominant["key"])
        a["priority"] = severity

    # --- Secondary actions (if second source > 20%) ---
    secondary_actions = []
    if secondary and secondary["pct"] >= 20:
        sec_lib = SOURCE_ACTION_MAP.get(secondary["key"], ATMOSPHERIC_ACTIONS)
        sec_actions = sec_lib.get(severity, sec_lib["monitor"])[:2]
        for a in sec_actions:
            a = dict(a)
            a["source"] = secondary["key"]
            a["source_label"] = secondary.get("source", secondary["key"])
            a["priority"] = "medium" if severity in ("enforce", "emergency") else "low"
            secondary_actions.append(a)

    # --- Compound actions ---
    compound = []
    if secondary and secondary["pct"] >= 25 and aqi > 200:
        pair1 = (dominant["key"], secondary["key"])
        pair2 = (secondary["key"], dominant["key"])
        for pair in [pair1, pair2]:
            if pair in COMPOUND_ACTIONS:
                ca = dict(COMPOUND_ACTIONS[pair])
                ca["priority"] = "critical" if aqi > 300 else "high"
                compound.append(ca)

    # --- Estimated AQI reduction ---
    total_impact = sum(a.get("impact", 0) for a in primary_actions[:3])
    if secondary_actions:
        total_impact += sum(a.get("impact", 0) for a in secondary_actions[:2]) * 0.5
    estimated_reduction = min(int(aqi * 0.4), round(total_impact * aqi / 200))

    # --- Summary ---
    summary = _generate_summary(aqi, severity, dominant, secondary, ward_name, report_count)

    return {
        "primary_actions": primary_actions,
        "secondary_actions": secondary_actions,
        "compound_actions": compound,
        "severity_tier": severity,
        "urgency": urgency,
        "dominant_source": dominant["key"],
        "dominant_source_label": dominant.get("source", ""),
        "estimated_aqi_reduction": estimated_reduction,
        "projected_aqi": max(30, aqi - estimated_reduction),
        "summary": summary,
    }


def _generate_summary(aqi, severity, dominant, secondary, ward_name, report_count):
    """Generate human-readable recommendation summary."""
    name = ward_name or "this ward"
    src = dominant.get("source", dominant["key"]).lower()

    if severity == "monitor":
        s = f"Air quality in {name} is within acceptable limits. Routine monitoring recommended with focus on {src}."
    elif severity == "moderate":
        s = f"Moderate pollution in {name} primarily from {src} ({dominant['pct']}%). Proactive measures recommended to prevent escalation."
        if report_count > 0:
            s += f" {report_count} citizen report(s) received — ground-level verification advised."
    elif severity == "enforce":
        s = f"Poor air quality in {name} — AQI {aqi}. Primary driver: {src} ({dominant['pct']}%). Enforcement actions required immediately."
        if secondary and secondary["pct"] >= 25:
            s += f" Secondary factor: {secondary.get('source', '').lower()} ({secondary['pct']}%) compounding the situation."
    else:
        s = f"EMERGENCY: {name} at AQI {aqi}. {src.upper()} ({dominant['pct']}%) is the critical driver. All emergency protocols must be activated."
        if report_count > 0:
            s += f" {report_count} citizen reports confirm ground-level severity."

    return s


# ═══════════════════════════════════════════════════════════════
# BEFORE/AFTER SIMULATION
# ═══════════════════════════════════════════════════════════════

def simulate_intervention(aqi, sources, actions_taken):
    """
    Simulate AQI improvement if specific actions are taken.
    Returns projected AQI and breakdown of impact.
    """
    total_reduction = 0
    impact_breakdown = []

    for action in actions_taken:
        impact = action.get("impact", 10)
        source = action.get("source", "general")
        # Impact scales with contribution of the target source
        source_pct = 50  # default
        for s in sources:
            if s["key"] == source:
                source_pct = s["pct"]
                break
        effective = round(impact * (source_pct / 100) * (aqi / 200))
        total_reduction += effective
        impact_breakdown.append({
            "action": action["action"],
            "reduction": effective,
            "source": source,
        })

    projected = max(30, aqi - total_reduction)
    pct_improvement = round((total_reduction / aqi) * 100) if aqi > 0 else 0

    return {
        "current_aqi": aqi,
        "projected_aqi": projected,
        "total_reduction": total_reduction,
        "pct_improvement": pct_improvement,
        "impact_breakdown": impact_breakdown,
    }
