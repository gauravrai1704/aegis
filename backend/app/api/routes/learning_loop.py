"""
Aegis-X Learning Loop API Routes
"""

from fastapi import APIRouter
from app.services.learning_loop import get_learning_loop_summary, get_audit_log

router = APIRouter()


@router.get("/summary")
async def learning_loop_summary():
    """Full Active Learning pipeline state — override stats, model drift, retrain status."""
    return get_learning_loop_summary()


@router.get("/audit")
async def audit_log(limit: int = 50):
    """Complete commander decision audit trail for compliance and export."""
    return get_audit_log(limit)
