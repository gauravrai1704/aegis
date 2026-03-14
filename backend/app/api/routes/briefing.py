"""
Aegis-X Mission Briefing API Route
"""

from fastapi import APIRouter, HTTPException
from app.services.briefing_generator import generate_briefing
from app.services.spread_model import compute_spread_forecast
from app.services import alert_store
from app.core.config import settings

router = APIRouter()


@router.get("/{alert_id}")
async def get_briefing(alert_id: str, include_spread: bool = True):
    """
    Generate a NATO SMEAC-format mission briefing for a specific alert.
    Optionally includes spread forecast (1h/3h/6h projections).
    """
    alert = alert_store.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    spread = compute_spread_forecast(settings.DISASTER_SCENARIO) if include_spread else None
    return generate_briefing(alert, spread_forecast=spread)
