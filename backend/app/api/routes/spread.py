"""
Aegis-X Predictive Spread Model API Route
"""

from fastapi import APIRouter
from app.services.spread_model import compute_spread_forecast
from app.core.config import settings

router = APIRouter()


@router.get("/forecast")
async def get_spread_forecast():
    """
    3-horizon (1h/3h/6h) cellular automaton spread forecast.
    Shows where the disaster is predicted to propagate based on
    sector topology, current risk scores, and scenario physics.
    """
    return compute_spread_forecast(settings.DISASTER_SCENARIO)
