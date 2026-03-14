"""
Aegis-X Mission Briefing Auto-Generator
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Converts AI alert data into a structured commander briefing document.
Format: NATO SMEAC (Situation, Mission, Execution, Admin/Logistics, Command).
This is the bridge between AI recommendations and field-ready orders.
"""

from typing import Dict, List, Optional
from datetime import datetime

from app.services.ai_engine import SECTORS
from app.models.schemas import Alert


def generate_briefing(alert: Alert, spread_forecast: Optional[Dict] = None) -> Dict:
    """
    Generate a SMEAC-format mission briefing from an alert + optional spread forecast.
    Returns structured JSON that renders as a formatted briefing document in the UI.
    """
    xai = alert.xai_explanation
    top_shap = xai.shap_features[0] if xai.shap_features else None
    sector_name = SECTORS.get(alert.sector, {}).get("name", alert.sector)
    pop = SECTORS.get(alert.sector, {}).get("pop", 0)
    scenario = alert.hazard_type.value
    sev = alert.severity.value.upper()

    # Situation
    situation = {
        "threat": (
            f"{sev} {scenario.upper()} event detected in {sector_name} (Sector {alert.sector}). "
            f"Composite AI risk score: {alert.risk_score:.2f}. "
            f"Approximately {pop:,} civilians potentially affected."
        ),
        "primary_driver": (
            f"{top_shap.feature} at {top_shap.value}{top_shap.unit} "
            f"(SHAP contribution: {top_shap.shap_value:.4f})" if top_shap else "Multiple factors"
        ),
        "model_confidence": f"{(xai.confidence * 100):.0f}%",
        "xai_reliability": xai.dual_xai_reliability,
        "sensor_conflicts": len(xai.conflict_signals),
        "ai_blind_spots": len(xai.uncertainty_regions),
        "image_quality": f"{(xai.lbp_texture_quality * 100):.0f}%",
        "caution": (
            f"⚠ {len(xai.conflict_signals)} sensor conflict(s) detected — ground truth verification required."
            if xai.conflict_signals else
            "All sensor modalities in agreement."
        ),
    }

    # Mission
    mission = {
        "objective": (
            f"Protect civilian life and infrastructure in {sector_name} from {scenario} event. "
            f"Achieve risk reduction to below MEDIUM threshold (< 0.6)."
        ),
        "priority_actions": [
            {
                "priority": a.priority,
                "action": a.action,
                "unit": a.unit,
                "impact": a.estimated_impact,
            }
            for a in sorted(alert.recommended_actions, key=lambda x: x.priority)
        ],
    }

    # Execution — counterfactual mitigation targets
    execution = {
        "mitigation_targets": [
            {
                "target": cf.feature,
                "current": f"{cf.current_value}{cf.unit}",
                "required": f"{cf.target_value}{cf.unit}",
                "expected_outcome": f"Risk downgrade from {cf.current_severity} to {cf.counterfactual_severity}",
                "action": cf.mitigation_hint,
            }
            for cf in xai.counterfactuals[:3]
        ],
        "spread_warning": (
            _build_spread_warning(spread_forecast) if spread_forecast else
            "Spread forecast not available — request from Spread Model tab."
        ),
    }

    # Admin / Logistics
    admin = {
        "populations_at_risk": {
            SECTORS[alert.sector]["name"]: SECTORS[alert.sector]["pop"]
        },
        "uncertainty_zones": [
            {"zone": f"Region {i+1}", "reason": u.reason[:80]}
            for i, u in enumerate(xai.uncertainty_regions[:3])
        ],
        "preprocessing_applied": xai.preprocessing_steps,
    }

    # Command
    command = {
        "decision_authority": "Human Commander (Verification Gate)",
        "ai_role": "Advisory only — all actions require commander authorization",
        "override_protocol": "Override via Verification Gate with mandatory reason (feeds Learning Loop)",
        "ai_system": xai.model_used,
        "briefing_generated": datetime.utcnow().isoformat(),
        "alert_id": alert.id,
        "classification": "OPERATIONAL — AEGIS-X AUTOMATED",
    }

    return {
        "format":     "NATO SMEAC",
        "alert_id":   alert.id,
        "generated":  datetime.utcnow().isoformat(),
        "sector":     alert.sector,
        "severity":   sev,
        "situation":  situation,
        "mission":    mission,
        "execution":  execution,
        "admin":      admin,
        "command":    command,
    }


def _build_spread_warning(forecast: Dict) -> str:
    if not forecast or not forecast.get("forecasts"):
        return "No spread forecast available."
    f1h = forecast["forecasts"][0]
    critical_1h = f1h.get("sectors_critical", [])
    high_1h     = f1h.get("sectors_high", [])
    if critical_1h:
        sector_names = [SECTORS.get(s, {}).get("name", s) for s in critical_1h]
        return f"SPREAD WARNING: {', '.join(sector_names)} projected CRITICAL within 1 hour. Pre-position units now."
    elif high_1h:
        sector_names = [SECTORS.get(s, {}).get("name", s) for s in high_1h]
        return f"SPREAD ADVISORY: {', '.join(sector_names)} projected HIGH risk within 1 hour. Monitor closely."
    return "Spread model: containment likely if current actions are executed within 30 minutes."
