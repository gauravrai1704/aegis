"""
Aegis-X Alert API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel

from app.models.schemas import Alert, ActionStatus
from app.services import alert_store, ai_engine

router = APIRouter()


class ApproveRequest(BaseModel):
    commander: str = "Commander"


class OverrideRequest(BaseModel):
    reason: str
    commander: str = "Commander"


@router.get("/", response_model=List[Alert])
async def list_alerts(limit: int = Query(20, ge=1, le=50)):
    """Get recent alerts with XAI explanations."""
    return alert_store.get_all_alerts(limit=limit)


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str):
    alert = alert_store.get_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/generate", response_model=Alert)
async def generate_alert(sector: Optional[str] = None):
    """Manually trigger AI analysis and generate an alert."""
    alert = ai_engine.generate_alert(sector_id=sector)
    return alert_store.store_alert(alert)


@router.post("/{alert_id}/approve", response_model=Alert)
async def approve_alert(alert_id: str, body: ApproveRequest):
    """Human Verification Gate — approve recommended actions."""
    alert = alert_store.approve_alert(alert_id, commander=body.commander)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.post("/{alert_id}/override", response_model=Alert)
async def override_alert(alert_id: str, body: OverrideRequest):
    """Human Override — reject AI recommendation with reason (feeds learning loop)."""
    alert = alert_store.override_alert(alert_id, reason=body.reason, commander=body.commander)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
