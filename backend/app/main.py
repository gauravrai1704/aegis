"""
Aegis-X: XAI-Driven Disaster Command & Decision System — Gold Edition
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn

from app.api.routes import (
    alerts, risk_map, analysis, dashboard,
    websocket_handler, learning_loop, spread, briefing, scenario,
)
from app.core.config import settings
from app.core.logging import setup_logging

setup_logging()

app = FastAPI(
    title="Aegis-X API — Gold Edition",
    description="XAI-Driven Disaster Command & Decision System with Active Learning",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(alerts.router,          prefix="/api/alerts",         tags=["Alerts"])
app.include_router(risk_map.router,        prefix="/api/risk-map",       tags=["Risk Map"])
app.include_router(analysis.router,        prefix="/api/analyze",        tags=["Analysis"])
app.include_router(dashboard.router,       prefix="/api/dashboard",      tags=["Dashboard"])
app.include_router(learning_loop.router,   prefix="/api/learning-loop",  tags=["Learning Loop"])
app.include_router(spread.router,          prefix="/api/spread",         tags=["Spread Model"])
app.include_router(briefing.router,        prefix="/api/briefing",       tags=["Briefing"])
app.include_router(scenario.router,          prefix="/api/scenario",     tags=["Scenario"])
app.include_router(websocket_handler.router, prefix="/ws",               tags=["WebSocket"])


@app.get("/health")
async def health_check():
    from app.services.ai_engine import XGBOOST_AVAILABLE
    return {
        "status": "operational",
        "system": "Aegis-X Gold Edition",
        "version": "2.0.0",
        "xgboost_active": XGBOOST_AVAILABLE,
        "new_features": [
            "Real XGBoost + SHAP TreeExplainer",
            "LBP Texture Pre-Processor",
            "Counterfactual Explanations",
            "Uncertainty Quantification",
            "Cross-Modal Conflict Detection",
            "Dual-Level XAI (Grad-CAM + Saliency)",
            "Active Learning Loop",
            "Predictive Spread Model",
            "Mission Briefing Generator",
        ],
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
