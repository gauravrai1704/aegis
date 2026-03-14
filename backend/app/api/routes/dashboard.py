"""
Aegis-X Dashboard Stats Route — Gold Edition
"""

from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import DashboardStats
from app.services import alert_store
from app.services.ai_engine import get_all_sector_risks, XGBOOST_AVAILABLE

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    risks = get_all_sector_risks()
    overall_risk = sum(risks.values()) / len(risks)
    stats = alert_store.get_stats()

    # Count conflict / uncertainty flags from recent alerts
    recent = alert_store.get_all_alerts(limit=20)
    conflict_count = sum(
        len(a.xai_explanation.conflict_signals)
        for a in recent if a.xai_explanation
    )
    uncertainty_count = sum(
        len(a.xai_explanation.uncertainty_regions)
        for a in recent if a.xai_explanation
    )

    return DashboardStats(
        active_alerts=stats["total_alerts"],
        pending_approvals=stats["pending_approvals"],
        units_deployed=max(0, stats["approved_today"] * 2),
        sectors_monitored=len(risks),
        overall_risk=round(overall_risk, 3),
        sensor_readings_per_min=len(risks) * 5,
        ai_predictions_today=stats["total_alerts"],
        override_count_today=stats["overrides_today"],
        conflict_alerts_today=conflict_count,
        uncertainty_flags_today=uncertainty_count,
    )


@router.get("/model-status")
async def model_status():
    """Returns which AI components are active (real vs simulated)."""
    return {
        "xgboost_active": XGBOOST_AVAILABLE,
        "shap_method": "TreeExplainer (real)" if XGBOOST_AVAILABLE else "Analytic (simulation)",
        "grad_cam": "ResNet-50 backbone (simulated output)",
        "saliency_maps": "Gradient saliency (simulated output)",
        "lbp_preprocessing": "Active",
        "counterfactuals": "Active",
        "uncertainty_quantification": "Active",
        "conflict_detection": "Active",
        "dual_xai": "Active",
        "learning_loop": "Active",
    }
