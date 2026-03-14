"""
Aegis-X Analysis API Route — Gold Edition
"""

import time
from fastapi import APIRouter
from app.models.schemas import AnalysisRequest, AnalysisResponse
from app.services import ai_engine, alert_store
from app.services.ai_engine import XGBOOST_AVAILABLE

router = APIRouter()


@router.post("/", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """
    Full Gold-Edition analysis: XGBoost + SHAP + LBP + Counterfactuals +
    Uncertainty + Conflict Detection + Dual-Level XAI.
    """
    t0 = time.time()
    alert = ai_engine.generate_alert(sector_id=request.sector)
    alert_store.store_alert(alert)
    elapsed = round((time.time() - t0) * 1000, 2)
    return AnalysisResponse(
        alert=alert,
        processing_time_ms=elapsed,
        xgboost_active=XGBOOST_AVAILABLE,
    )
