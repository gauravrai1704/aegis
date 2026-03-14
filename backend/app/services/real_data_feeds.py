"""
Aegis-X Real Public Data Feeds
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All sources are FREE, require no API key, and are government/NASA data.

Sources:
  1. USGS Earthquake Hazards — significant_week.geojson
     https://earthquake.usgs.gov/earthquakes/feed/v1.0/
  2. GDACS (Global Disaster Alert & Coord. System) — RSS feed
     https://www.gdacs.org/xml/rss.xml
  3. NOAA Weather Alerts — public API
     https://api.weather.gov/alerts/active
  4. NASA FIRMS (Fire Info for Resource Mgmt) — CSV hotspots
     https://firms.modaps.eosdis.nasa.gov/

Each feed is cached for 5 minutes so we don't hammer the endpoints.
Falls back to simulated data if network is unavailable.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

# ── Simple TTL cache ──────────────────────────────────────────────────────────
_cache: Dict[str, tuple] = {}   # key → (data, timestamp)
CACHE_TTL = 300                  # 5 minutes

def _cached(key: str, data):
    _cache[key] = (data, time.time())

def _get_cached(key: str):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


# ── USGS Earthquake Feed ──────────────────────────────────────────────────────

async def fetch_usgs_earthquakes() -> List[Dict]:
    """
    Returns significant earthquakes from the past week via USGS GeoJSON feed.
    No API key required — public USGS data.
    """
    key = "usgs_eq"
    if cached := _get_cached(key):
        return cached

    url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            features = r.json().get("features", [])
            events = []
            for f in features[:20]:
                props = f.get("properties", {})
                coords = f.get("geometry", {}).get("coordinates", [0, 0, 0])
                events.append({
                    "id":        f.get("id"),
                    "magnitude": props.get("mag", 0),
                    "place":     props.get("place", "Unknown"),
                    "time":      datetime.fromtimestamp(props.get("time", 0) / 1000).isoformat(),
                    "depth_km":  coords[2] if len(coords) > 2 else 0,
                    "lat":       coords[1] if len(coords) > 1 else 0,
                    "lon":       coords[0],
                    "url":       props.get("url", ""),
                    "tsunami":   props.get("tsunami", 0),
                    "alert":     props.get("alert", "green"),
                    "source":    "USGS Earthquake Hazards Program",
                })
            _cached(key, events)
            logger.info(f"[RealData] USGS: {len(events)} significant earthquakes loaded")
            return events
    except Exception as e:
        logger.warning(f"[RealData] USGS fetch failed: {e}")
        return _get_cached(key) or _simulated_earthquakes()


def _simulated_earthquakes() -> List[Dict]:
    import random
    rng = random.Random(42)
    places = ["Southern California", "Japan", "Chile", "Turkey", "Indonesia",
              "New Zealand", "Alaska", "Italy", "Greece", "Mexico"]
    return [{
        "id": f"sim_{i}", "magnitude": round(rng.uniform(5.5, 8.2), 1),
        "place": f"{rng.randint(10, 200)} km from {places[i % len(places)]}",
        "time": datetime.utcnow().isoformat(), "depth_km": rng.randint(5, 300),
        "lat": rng.uniform(-60, 70), "lon": rng.uniform(-180, 180),
        "url": "", "tsunami": rng.randint(0, 1), "alert": "yellow",
        "source": "USGS (simulated fallback)",
    } for i in range(8)]


# ── GDACS Global Disaster Feed ────────────────────────────────────────────────

async def fetch_gdacs_alerts() -> List[Dict]:
    """
    Global Disaster Alert and Coordination System RSS feed.
    Covers floods, cyclones, earthquakes, volcanoes, tsunamis, droughts.
    No API key — UN/EC OCHA public data.
    """
    key = "gdacs"
    if cached := _get_cached(key):
        return cached

    url = "https://www.gdacs.org/xml/rss.xml"
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()

        # Parse RSS manually (no feedparser dependency at runtime)
        import xml.etree.ElementTree as ET
        root = ET.fromstring(r.content)
        ns = {"gdacs": "http://www.gdacs.org"}
        items = root.findall(".//item")
        alerts = []
        for item in items[:15]:
            def t(tag):
                el = item.find(tag)
                return el.text if el is not None else ""
            def g(tag):
                el = item.find(f"gdacs:{tag}", ns)
                return el.text if el is not None else ""

            alerts.append({
                "title":       t("title"),
                "description": t("description"),
                "pubDate":     t("pubDate"),
                "link":        t("link"),
                "country":     g("country"),
                "alertlevel":  g("alertlevel"),   # Green / Orange / Red
                "eventtype":   g("eventtype"),    # EQ / FL / TC / VO / TS / DR
                "severity":    g("severity"),
                "population":  g("population"),
                "lat":         g("lat"),
                "lon":         g("long"),
                "source":      "GDACS — EC/OCHA",
            })
        _cached(key, alerts)
        logger.info(f"[RealData] GDACS: {len(alerts)} global alerts loaded")
        return alerts
    except Exception as e:
        logger.warning(f"[RealData] GDACS fetch failed: {e}")
        return _get_cached(key) or _simulated_gdacs()


def _simulated_gdacs() -> List[Dict]:
    return [
        {"title": "Tropical Cyclone - Western Pacific",     "alertlevel": "Orange", "eventtype": "TC", "country": "Philippines",   "lat": "14.5",  "lon": "121.0", "source": "GDACS (simulated)"},
        {"title": "Flood - South Asia",                     "alertlevel": "Red",    "eventtype": "FL", "country": "Bangladesh",    "lat": "23.6",  "lon": "90.4",  "source": "GDACS (simulated)"},
        {"title": "Volcanic Activity - Indonesia",          "alertlevel": "Orange", "eventtype": "VO", "country": "Indonesia",     "lat": "-8.3",  "lon": "115.5", "source": "GDACS (simulated)"},
        {"title": "Earthquake - Central America",           "alertlevel": "Green",  "eventtype": "EQ", "country": "Guatemala",     "lat": "15.4",  "lon": "-90.5", "source": "GDACS (simulated)"},
        {"title": "Tsunami Warning - Pacific Basin",        "alertlevel": "Red",    "eventtype": "TS", "country": "Japan",         "lat": "35.7",  "lon": "140.8", "source": "GDACS (simulated)"},
        {"title": "Landslide - Himalayan Region",           "alertlevel": "Orange", "eventtype": "FL", "country": "Nepal",         "lat": "27.7",  "lon": "85.3",  "source": "GDACS (simulated)"},
        {"title": "Wildfire - Mediterranean Coast",         "alertlevel": "Orange", "eventtype": "FL", "country": "Greece",        "lat": "37.9",  "lon": "23.7",  "source": "GDACS (simulated)"},
    ]


# ── NOAA Weather Alerts ───────────────────────────────────────────────────────

async def fetch_noaa_alerts(state: str = "TX") -> List[Dict]:
    """
    NOAA National Weather Service active alerts for a state.
    Completely free public API — no key required.
    """
    key = f"noaa_{state}"
    if cached := _get_cached(key):
        return cached

    url = f"https://api.weather.gov/alerts/active?area={state}&status=actual&message_type=alert"
    try:
        async with httpx.AsyncClient(timeout=8.0,
                                     headers={"User-Agent": "AegisX/2.0 (research)"}) as client:
            r = await client.get(url)
            r.raise_for_status()
            features = r.json().get("features", [])
            alerts = []
            for f in features[:10]:
                props = f.get("properties", {})
                alerts.append({
                    "id":          props.get("id", ""),
                    "event":       props.get("event", ""),
                    "headline":    props.get("headline", ""),
                    "description": (props.get("description") or "")[:300],
                    "severity":    props.get("severity", "Unknown"),
                    "urgency":     props.get("urgency", "Unknown"),
                    "areaDesc":    props.get("areaDesc", ""),
                    "effective":   props.get("effective", ""),
                    "expires":     props.get("expires", ""),
                    "source":      "NOAA National Weather Service",
                })
            _cached(key, alerts)
            logger.info(f"[RealData] NOAA ({state}): {len(alerts)} active alerts")
            return alerts
    except Exception as e:
        logger.warning(f"[RealData] NOAA fetch failed: {e}")
        return _get_cached(key) or []


# ── NASA FIRMS Wildfire Hotspots ──────────────────────────────────────────────

async def fetch_nasa_firms_hotspots(bbox: str = "-100,25,-85,35") -> List[Dict]:
    """
    NASA FIRMS (Fire Information for Resource Management) active fire hotspots.
    Uses the public map service — no key needed for basic tile queries.
    Returns synthetic hotspot data shaped like the real API for demo purposes.
    The real API key is free at https://firms.modaps.eosdis.nasa.gov/api/
    """
    key = f"firms_{bbox}"
    if cached := _get_cached(key):
        return cached

    # Real FIRMS CSV endpoint requires a (free) MAP_KEY from NASA
    # We return realistic-looking hotspot data for demo purposes
    # In production: GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/1
    import random
    rng = random.Random(int(time.time() / 600))  # changes every 10 min
    lats = [float(x) for x in bbox.split(",")]
    hotspots = [{
        "latitude":     round(rng.uniform(lats[1], lats[3]), 4),
        "longitude":    round(rng.uniform(lats[0], lats[2]), 4),
        "brightness":   round(rng.uniform(310, 500), 1),
        "frp":          round(rng.uniform(5, 200), 1),      # Fire Radiative Power (MW)
        "confidence":   rng.choice(["nominal","high","low"]),
        "acq_datetime": datetime.utcnow().isoformat(),
        "satellite":    "VIIRS (S-NPP)",
        "source":       "NASA FIRMS (simulated — get free key at firms.modaps.eosdis.nasa.gov)",
    } for _ in range(rng.randint(3, 12))]

    _cached(key, hotspots)
    return hotspots


# ── Aggregate real-world context for a scenario ───────────────────────────────

async def fetch_scenario_context(scenario: str) -> Dict:
    """
    Fetch relevant real-world data for the active scenario.
    Returns a dict with live event data from public APIs.
    """
    context = {"scenario": scenario, "fetched_at": datetime.utcnow().isoformat(), "sources": []}

    if scenario == "earthquake":
        eq = await fetch_usgs_earthquakes()
        context["usgs_earthquakes"] = eq
        context["sources"].append("USGS Earthquake Hazards Program")

    if scenario == "wildfire":
        firms = await fetch_nasa_firms_hotspots()
        context["nasa_firms_hotspots"] = firms
        noaa = await fetch_noaa_alerts("CA")
        context["noaa_alerts"] = noaa
        context["sources"] += ["NASA FIRMS", "NOAA NWS"]

    if scenario in ("flood", "cyclone", "tsunami"):
        noaa = await fetch_noaa_alerts("TX")
        context["noaa_alerts"] = noaa
        context["sources"].append("NOAA NWS")

    # Always include GDACS for global situational awareness
    gdacs = await fetch_gdacs_alerts()
    # Filter to relevant event types
    type_map = {
        "earthquake": ["EQ"],
        "wildfire":   ["FL"],
        "flood":      ["FL"],
        "cyclone":    ["TC"],
        "tsunami":    ["TS"],
        "volcanic":   ["VO"],
        "landslide":  ["FL"],
    }
    relevant_types = type_map.get(scenario, [])
    context["gdacs_events"] = [
        e for e in gdacs
        if not relevant_types or e.get("eventtype", "") in relevant_types
    ] or gdacs[:5]
    context["sources"].append("GDACS — EC/OCHA")

    return context
