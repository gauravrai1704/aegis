"""
Aegis-X Scenario Switcher API
Allows live scenario switching without restarting the server.
Also exposes real public data context for each scenario.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncio

from app.core.config import settings, ALL_SCENARIOS
from app.services.real_data_feeds import fetch_scenario_context

router = APIRouter()

# Scenario metadata for the frontend
SCENARIO_META = {
    "flood": {
        "label":       "Flood",
        "icon":        "🌊",
        "color":       "#3b82f6",
        "description": "Flash floods, storm surge, river overflow",
        "region":      "Gulf Coast, USA",
        "lat":         29.76, "lon": -95.37,
        "sensors":     ["Water Level Gauge", "Rain Gauge", "Flow Meter", "Soil Moisture", "Road Sensor"],
        "real_feeds":  ["NOAA NWS Alerts", "USGS Stream Gauges", "GDACS Flood Events"],
    },
    "wildfire": {
        "label":       "Wildfire",
        "icon":        "🔥",
        "color":       "#f97316",
        "description": "Forest fires, brush fires, urban interface fires",
        "region":      "California, USA",
        "lat":         37.77, "lon": -122.41,
        "sensors":     ["Thermometer", "Hygrometer", "Anemometer", "AQI Sensor", "NDVI Camera"],
        "real_feeds":  ["NASA FIRMS VIIRS Hotspots", "NOAA Red Flag Warnings", "GDACS Fire Events"],
    },
    "earthquake": {
        "label":       "Earthquake",
        "icon":        "🌍",
        "color":       "#8b5cf6",
        "description": "Tectonic events, aftershock sequences, induced seismicity",
        "region":      "Pacific Ring of Fire",
        "lat":         35.68, "lon": 139.69,
        "sensors":     ["Seismometer", "P-Wave Detector", "Strainmeter", "Tiltmeter", "Geophone"],
        "real_feeds":  ["USGS Earthquake Catalog (Live)", "GDACS Seismic Events"],
    },
    "tsunami": {
        "label":       "Tsunami",
        "icon":        "🌐",
        "color":       "#06b6d4",
        "description": "Seismically generated ocean waves, coastal inundation",
        "region":      "Pacific Basin",
        "lat":         35.68, "lon": 139.69,
        "sensors":     ["DART Buoy", "Coastal Tide Gauge", "Inundation Sensor", "Coastal Retreat Sensor", "Seafloor Pressure"],
        "real_feeds":  ["PTWC Tsunami Warnings", "GDACS Tsunami Events", "USGS Seismic Triggers"],
    },
    "cyclone": {
        "label":       "Cyclone",
        "icon":        "🌀",
        "color":       "#a855f7",
        "description": "Tropical cyclones, hurricanes, typhoons",
        "region":      "Western Pacific",
        "lat":         14.59, "lon": 121.0,
        "sensors":     ["Dropsonde", "Buoy Barometer", "Storm Surge Gauge", "Rain Gauge", "Satellite Tracker"],
        "real_feeds":  ["JTWC Tropical Warnings", "NOAA Hurricane Center", "GDACS Cyclone Events"],
    },
    "landslide": {
        "label":       "Landslide",
        "icon":        "⛰️",
        "color":       "#78716c",
        "description": "Debris flows, mudslides, slope failures",
        "region":      "Himalayan Region",
        "lat":         27.71, "lon": 85.31,
        "sensors":     ["LiDAR Slope Sensor", "TDR Moisture Sensor", "Tipping Bucket Gauge", "Extensometer", "Piezometer"],
        "real_feeds":  ["GDACS Landslide Events", "NASA Global Landslide Catalog"],
    },
    "volcanic": {
        "label":       "Volcanic",
        "icon":        "🌋",
        "color":       "#dc2626",
        "description": "Volcanic eruptions, lava flows, pyroclastic events",
        "region":      "Indonesia",
        "lat":         -8.34, "lon": 115.51,
        "sensors":     ["DOAS SO2 Spectrometer", "Seismometer Array", "GPS/InSAR Ground Deformation", "VAAC Ash Radar", "Thermal Camera"],
        "real_feeds":  ["VAAC Volcanic Ash Advisories", "GVP Eruption Reports", "GDACS Volcanic Events"],
    },
}


class ScenarioSwitchRequest(BaseModel):
    scenario: str


@router.get("/")
async def list_scenarios():
    """List all supported hazard scenarios with metadata."""
    return {
        "current": settings.DISASTER_SCENARIO,
        "available": ALL_SCENARIOS,
        "meta": SCENARIO_META,
    }


@router.get("/current")
async def get_current_scenario():
    meta = SCENARIO_META.get(settings.DISASTER_SCENARIO, {})
    return {
        "scenario":    settings.DISASTER_SCENARIO,
        **meta,
    }


@router.post("/switch")
async def switch_scenario(body: ScenarioSwitchRequest):
    """
    Live scenario switch — no server restart needed.
    Reinitializes the XGBoost model for the new scenario.
    """
    if body.scenario not in ALL_SCENARIOS:
        raise HTTPException(400, f"Unknown scenario '{body.scenario}'. Must be one of: {ALL_SCENARIOS}")

    settings.DISASTER_SCENARIO = body.scenario

    # Reinitialize world state for new scenario
    from app.services.ai_engine import _scenario_state, SECTORS
    import random
    for sector in SECTORS:
        _scenario_state[sector] = random.uniform(0.1, 0.4)

    meta = SCENARIO_META.get(body.scenario, {})
    return {
        "switched_to": body.scenario,
        "message": f"Scenario switched to {meta.get('label', body.scenario)}. AI models re-initialized.",
        **meta,
    }


@router.get("/real-data")
async def get_real_data():
    """
    Fetch live public data for the current scenario.
    Sources: USGS, NASA FIRMS, NOAA, GDACS — all free, no API key.
    """
    return await fetch_scenario_context(settings.DISASTER_SCENARIO)


@router.get("/real-data/{scenario}")
async def get_real_data_for_scenario(scenario: str):
    if scenario not in ALL_SCENARIOS:
        raise HTTPException(400, f"Unknown scenario '{scenario}'")
    return await fetch_scenario_context(scenario)
