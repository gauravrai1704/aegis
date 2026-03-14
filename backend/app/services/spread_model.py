"""
Aegis-X Predictive Spread Modeling
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Uses current risk scores and sector topology to forecast
where a disaster will spread in the next 1h / 3h / 6h.

This is the "Predictive Risk Modeling" component from the abstract —
implemented as a cellular automaton propagation model with physics
constraints per disaster type.
"""

import random
import math
from typing import Dict, List
from datetime import datetime, timedelta

from app.services.ai_engine import SECTORS, get_all_sector_risks
from app.core.config import settings

# Sector adjacency graph (which sectors border each other)
ADJACENCY = {
    "A1": ["A2", "B1", "D2"],
    "A2": ["A1", "B2", "C1"],
    "B1": ["A1", "C2"],
    "B2": ["A2", "C1"],
    "C1": ["A2", "B2", "D1"],
    "C2": ["B1"],
    "D1": ["C1"],
    "D2": ["A1"],
}

# Spread velocity by scenario (risk units per hour)
SPREAD_VELOCITY = {
    "flood":      0.18,   # water spreads fast along drainage paths
    "wildfire":   0.25,   # fire spreads fastest — wind-driven
    "earthquake": 0.05,   # structural risk spreads slower — shockwave decay
}

# Propagation decay per adjacency hop
DECAY_FACTOR = 0.65


def compute_spread_forecast(scenario: str) -> Dict:
    """
    Run a 3-step (1h, 3h, 6h) cellular automaton spread model.
    Returns sector risk projections at each time horizon.
    """
    current_risks = get_all_sector_risks()
    velocity = SPREAD_VELOCITY.get(scenario, 0.15)
    now = datetime.utcnow()

    forecasts = []
    for hours, label in [(1, "1h"), (3, "3h"), (6, "6h")]:
        projected = _propagate(current_risks, velocity, hours, scenario)
        forecasts.append({
            "horizon":   label,
            "hours":     hours,
            "timestamp": (now + timedelta(hours=hours)).isoformat(),
            "sectors":   projected,
            "highest_risk_sector": max(projected, key=projected.get),
            "sectors_critical":    [s for s, v in projected.items() if v >= 0.8],
            "sectors_high":        [s for s, v in projected.items() if 0.6 <= v < 0.8],
        })

    # Identify primary spread corridor (chain of highest projected risk)
    spread_path = _find_spread_path(current_risks, scenario)

    return {
        "scenario":     scenario,
        "generated_at": now.isoformat(),
        "current_risks": current_risks,
        "forecasts":     forecasts,
        "spread_path":   spread_path,
        "model":         "Cellular Automaton Propagation (physics-constrained)",
        "confidence":    _forecast_confidence(current_risks),
    }


def _propagate(risks: Dict[str, float], velocity: float, hours: int, scenario: str) -> Dict[str, float]:
    """One step of CA propagation — risk flows from high to adjacent sectors."""
    result = {s: v for s, v in risks.items()}
    for step in range(hours):
        new_result = {s: v for s, v in result.items()}
        for sector, adj_list in ADJACENCY.items():
            for adj in adj_list:
                if adj in result:
                    # Flow from higher-risk to lower-risk neighbor
                    flow = max(0, result[adj] - result[sector]) * velocity * DECAY_FACTOR
                    # Add noise for realism
                    flow += random.gauss(0, 0.01)
                    new_result[sector] = min(0.99, new_result[sector] + flow)
        result = new_result

    # Apply scenario-specific physics
    for sector in result:
        if scenario == "wildfire":
            # Wind amplification in open sectors
            if sector in ["D2", "C2"]:
                result[sector] = min(0.99, result[sector] * 1.12)
        elif scenario == "flood":
            # Gravity: lower-elevation sectors (A1, B1) receive more flow
            if sector in ["A1", "B1"]:
                result[sector] = min(0.99, result[sector] * 1.08)

    return {s: round(v, 3) for s, v in result.items()}


def _find_spread_path(risks: Dict[str, float], scenario: str) -> List[Dict]:
    """Identify the most likely propagation corridor via Dijkstra-like traversal."""
    start = max(risks, key=risks.get)
    path = [{"sector": start, "risk": risks[start], "step": 0}]
    visited = {start}
    current = start

    for step in range(1, 4):
        adj = ADJACENCY.get(current, [])
        candidates = [(s, risks.get(s, 0)) for s in adj if s not in visited]
        if not candidates:
            break
        # Prefer highest-risk unvisited neighbor
        next_sector = max(candidates, key=lambda x: x[1])[0]
        path.append({
            "sector": next_sector,
            "risk": round(risks.get(next_sector, 0), 3),
            "step": step,
            "sector_name": SECTORS.get(next_sector, {}).get("name", next_sector),
        })
        visited.add(next_sector)
        current = next_sector

    return path


def _forecast_confidence(risks: Dict[str, float]) -> float:
    """Higher variance in current readings → less confident forecast."""
    vals = list(risks.values())
    mean = sum(vals) / len(vals)
    variance = sum((v - mean) ** 2 for v in vals) / len(vals)
    # Lower variance means more predictable spread
    confidence = max(0.45, 1.0 - variance * 2)
    return round(confidence, 2)
