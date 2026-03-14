"""
Aegis-X Alert State Manager — Gold Edition
Integrates with Learning Loop on every approve/override decision.
"""

from typing import Dict, List, Optional
from datetime import datetime
from collections import deque
import logging

from app.models.schemas import Alert, ActionStatus
from app.core.config import settings

logger = logging.getLogger(__name__)

_alerts: Dict[str, Alert] = {}
_alert_history: deque = deque(maxlen=settings.MAX_ALERTS_HISTORY)
_approved_count = 0
_override_count = 0


def store_alert(alert: Alert) -> Alert:
    _alerts[alert.id] = alert
    _alert_history.append(alert.id)
    return alert


def get_alert(alert_id: str) -> Optional[Alert]:
    return _alerts.get(alert_id)


def get_all_alerts(limit: int = 20) -> List[Alert]:
    ids = list(_alert_history)[-limit:][::-1]
    return [_alerts[i] for i in ids if i in _alerts]


def approve_alert(alert_id: str, commander: str = "Commander") -> Optional[Alert]:
    global _approved_count
    alert = _alerts.get(alert_id)
    if not alert:
        return None
    alert.status = ActionStatus.APPROVED
    for action in alert.recommended_actions:
        if action.status == ActionStatus.PENDING:
            action.status = ActionStatus.EXECUTED
            action.approved_by = commander
            action.timestamp = datetime.utcnow()
    _approved_count += 1

    # Feed the Learning Loop
    try:
        from app.services.learning_loop import log_approval
        log_approval(alert_id, alert.sector, alert.risk_score, commander)
    except Exception as e:
        logger.warning(f"Learning loop approval log failed: {e}")

    logger.info(f"Alert {alert_id} APPROVED by {commander}")
    return alert


def override_alert(alert_id: str, reason: str, commander: str = "Commander") -> Optional[Alert]:
    global _override_count
    alert = _alerts.get(alert_id)
    if not alert:
        return None
    alert.status = ActionStatus.OVERRIDDEN
    alert.override_reason = reason
    for action in alert.recommended_actions:
        action.status = ActionStatus.OVERRIDDEN
    _override_count += 1

    # Feed the Learning Loop with full context
    try:
        from app.services.learning_loop import log_override
        xai = alert.xai_explanation
        top = xai.shap_features[0].feature if xai and xai.shap_features else "unknown"
        log_override(
            alert_id=alert_id,
            sector=alert.sector,
            risk_score=alert.risk_score,
            shap_top_feature=top,
            commander_reason=reason,
            commander_id=commander,
        )
    except Exception as e:
        logger.warning(f"Learning loop override log failed: {e}")

    logger.info(f"Alert {alert_id} OVERRIDDEN by {commander}. Reason: {reason}")
    return alert


def get_stats():
    pending = sum(1 for a in _alerts.values() if a.status == ActionStatus.PENDING)
    return {
        "total_alerts": len(_alerts),
        "pending_approvals": pending,
        "approved_today": _approved_count,
        "overrides_today": _override_count,
    }
