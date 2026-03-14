"""
Aegis-X Risk Map API Routes
Returns GeoJSON-compatible risk data for the map overlay
"""

from fastapi import APIRouter
from datetime import datetime

from app.models.schemas import RiskMapResponse, RiskZone, SeverityLevel, HazardType
from app.services.ai_engine import SECTORS, get_all_sector_risks
from app.core.config import settings

router = APIRouter()

# Approximate sector polygon offsets (delta lat/lon from center)
POLYGON_OFFSETS = [
    (-0.01, -0.01), (0.01, -0.01), (0.01, 0.01), (-0.01, 0.01)
]


def risk_to_severity(score: float) -> SeverityLevel:
    if score >= 0.8: return SeverityLevel.CRITICAL
    if score >= 0.6: return SeverityLevel.HIGH
    if score >= 0.3: return SeverityLevel.MEDIUM
    return SeverityLevel.LOW


@router.get("/", response_model=RiskMapResponse)
async def get_risk_map():
    """Get current risk zones for all monitored sectors."""
    risks = get_all_sector_risks()
    hazard = {
        "flood": HazardType.FLOOD,
        "wildfire": HazardType.WILDFIRE,
        "earthquake": HazardType.EARTHQUAKE,
    }.get(settings.DISASTER_SCENARIO, HazardType.FLOOD)

    zones = []
    for sector_id, risk_score in risks.items():
        info = SECTORS[sector_id]
        zones.append(RiskZone(
            sector_id=sector_id,
            sector_name=info["name"],
            risk_score=risk_score,
            severity=risk_to_severity(risk_score),
            hazard_type=hazard,
            coordinates=[
                {"lat": info["lat"] + dy, "lon": info["lon"] + dx}
                for dx, dy in POLYGON_OFFSETS
            ],
            center={"lat": info["lat"], "lon": info["lon"]},
            affected_population=info["pop"],
            active_alerts=1 if risk_score >= 0.5 else 0,
        ))

    overall = max(zones, key=lambda z: z.risk_score).severity
    active_incidents = sum(1 for z in zones if z.active_alerts > 0)

    return RiskMapResponse(
        timestamp=datetime.utcnow(),
        zones=zones,
        overall_threat_level=overall,
        active_incidents=active_incidents,
        units_deployed=active_incidents * 2,
    )
