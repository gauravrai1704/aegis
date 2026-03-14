"""
Aegis-X Configuration — v3.0 Multi-Hazard Edition
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "Aegis-X"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "aegis-x-super-secret-key-change-in-prod")

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "https://aegis-x.vercel.app"),
        "https://*.vercel.app",
    ]

    # Multi-hazard — any of the 7 supported scenarios
    DISASTER_SCENARIO: str = os.getenv("DISASTER_SCENARIO", "flood")
    SIMULATION_INTERVAL: float = float(os.getenv("SIMULATION_INTERVAL", "4.0"))
    MAX_ALERTS_HISTORY: int = 80

    # AI thresholds
    RISK_THRESHOLD_LOW: float = 0.3
    RISK_THRESHOLD_MED: float = 0.6
    RISK_THRESHOLD_HIGH: float = 0.8

    # Map centre — defaults to Gulf of Mexico (multi-hazard region)
    MAP_CENTER_LAT: float = 29.7604
    MAP_CENTER_LON: float = -95.3698

    # Real data feeds (all free, no API key)
    USGS_EARTHQUAKE_FEED: str = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson"
    NASA_FIRMS_URL: str = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/1234567890abcdef/VIIRS_SNPP_NRT/world/1"
    GDACS_RSS: str = "https://www.gdacs.org/xml/rss.xml"
    NOAA_ALERTS: str = "https://api.weather.gov/alerts/active?status=actual&message_type=alert&urgency=Immediate"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# ── All supported hazard scenarios ──────────────────────────────────────────
ALL_SCENARIOS = [
    "flood",
    "wildfire",
    "earthquake",
    "tsunami",
    "cyclone",
    "landslide",
    "volcanic",
]
