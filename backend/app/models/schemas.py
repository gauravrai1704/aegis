"""
Aegis-X Data Models — Gold Edition
Adds: CounterfactualExplanation, UncertaintyRegion, ConflictSignal,
      SaliencyRegion, and extended XAIExplanation / Alert schemas.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    OVERRIDDEN = "overridden"
    EXECUTED = "executed"


class HazardType(str, Enum):
    FLOOD      = "flood"
    WILDFIRE   = "wildfire"
    EARTHQUAKE = "earthquake"
    TSUNAMI    = "tsunami"
    CYCLONE    = "cyclone"
    LANDSLIDE  = "landslide"
    VOLCANIC   = "volcanic"


# ── Core XAI Models ──────────────────────────────────────────────────────────

class SHAPFeature(BaseModel):
    feature: str
    value: float
    shap_value: float
    unit: str = ""
    description: str = ""


class GradCAMRegion(BaseModel):
    sector: str
    x: float
    y: float
    width: float
    height: float
    intensity: float
    label: str


# ── NEW: Saliency Map (local pixel-level, dual-level XAI) ────────────────────

class SaliencyRegion(BaseModel):
    """
    Fine-grained pixel-level attention region from gradient saliency analysis.
    Complements Grad-CAM's coarse global attention with precise structural focus.
    UCL (2025) recommendation: dual-level XAI for reliability validation.
    """
    x: float
    y: float
    radius: float
    saliency_score: float         # 0-1, how strongly this pixel drove the decision
    structural_element: str       # e.g. "Bridge foundation", "Wall crack pattern"
    pixel_confidence: float       # 0-1 confidence at pixel level
    reliability_flag: str = "MEDIUM"  # HIGH | MEDIUM | LOW


# ── NEW: Counterfactual Explanation ──────────────────────────────────────────

class CounterfactualExplanation(BaseModel):
    """
    Contrastive / What-If explanation: shows what change to a specific sensor
    reading would drop the risk to a lower severity level.
    Addresses the XAI gap: not just WHY risk is high, but WHAT would make it lower.
    """
    feature: str
    current_value: float
    target_value: float
    unit: str
    current_risk: float
    counterfactual_risk: float
    current_severity: str
    counterfactual_severity: str
    explanation: str
    mitigation_hint: str          # actionable step to achieve the counterfactual


# ── NEW: Uncertainty Region ───────────────────────────────────────────────────

class UncertaintyRegion(BaseModel):
    """
    AI blind spot: a region where the model cannot make a confident prediction.
    Sources: cloud/smoke occlusion, motion blur, sensor dropout, decision boundary.
    Implements 'Humble AI' — the system flags its own limitations.
    """
    x: float
    y: float
    width: float
    height: float
    uncertainty_score: float      # 0-1 (1 = completely uncertain)
    reason: str                   # human-readable explanation of why uncertain
    color_code: str = "gray"      # "gray" or "purple" for UI rendering


# ── NEW: Cross-Modal Conflict Signal ─────────────────────────────────────────

class ConflictSignal(BaseModel):
    """
    Detects when IoT sensor readings and visual analysis (Grad-CAM) disagree.
    Example: sensor reads 'dry' but drone image shows flooding.
    The #1 real-world failure mode in disaster AI: undetected sensor malfunction.
    """
    sensor_id: str
    sensor_type: str
    sensor_value: float
    sensor_unit: str
    sensor_implied_risk: float    # risk level implied by sensor reading alone
    visual_implied_risk: float    # risk level from visual/Grad-CAM analysis
    discrepancy_score: float      # abs difference (>0.45 = flagged)
    direction: str                # "IoT LOW vs Visual HIGH" or vice versa
    message: str                  # full human-readable conflict description
    recommended_action: str       # what the commander should do about it


# ── Extended XAI Explanation ─────────────────────────────────────────────────

class XAIExplanation(BaseModel):
    summary: str
    shap_features: List[SHAPFeature]
    grad_cam_regions: List[GradCAMRegion]
    confidence: float
    model_used: str
    reasoning_trace: List[str]

    # Gold Edition additions
    saliency_regions: List[SaliencyRegion] = []
    counterfactuals: List[CounterfactualExplanation] = []
    uncertainty_regions: List[UncertaintyRegion] = []
    conflict_signals: List[ConflictSignal] = []
    lbp_texture_quality: float = 1.0
    motion_blur_detected: bool = False
    preprocessing_steps: List[str] = []
    dual_xai_reliability: str = "MEDIUM"   # HIGH | MEDIUM | LOW


# ── Alert ────────────────────────────────────────────────────────────────────

class RecommendedAction(BaseModel):
    id: str
    action: str
    unit: str
    sector: str
    priority: int
    estimated_impact: str
    status: ActionStatus = ActionStatus.PENDING
    approved_by: Optional[str] = None
    timestamp: Optional[datetime] = None


class Alert(BaseModel):
    id: str
    timestamp: datetime
    hazard_type: HazardType
    severity: SeverityLevel
    sector: str
    coordinates: Dict[str, float]
    risk_score: float
    title: str
    description: str
    xai_explanation: XAIExplanation
    recommended_actions: List[RecommendedAction]
    status: ActionStatus = ActionStatus.PENDING
    override_reason: Optional[str] = None


# ── Risk Map ─────────────────────────────────────────────────────────────────

class RiskZone(BaseModel):
    sector_id: str
    sector_name: str
    risk_score: float
    severity: SeverityLevel
    hazard_type: HazardType
    coordinates: List[Dict[str, float]]
    center: Dict[str, float]
    affected_population: int
    active_alerts: int


class RiskMapResponse(BaseModel):
    timestamp: datetime
    zones: List[RiskZone]
    overall_threat_level: SeverityLevel
    active_incidents: int
    units_deployed: int


# ── Sensor / IoT ─────────────────────────────────────────────────────────────

class SensorReading(BaseModel):
    sensor_id: str
    sensor_type: str
    location: Dict[str, float]
    value: float
    unit: str
    timestamp: datetime
    anomaly_detected: bool
    anomaly_score: float = 0.0


# ── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    active_alerts: int
    pending_approvals: int
    units_deployed: int
    sectors_monitored: int
    overall_risk: float
    sensor_readings_per_min: int
    ai_predictions_today: int
    override_count_today: int
    conflict_alerts_today: int = 0      # new
    uncertainty_flags_today: int = 0    # new


# ── Analysis ─────────────────────────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    sector: str
    sensor_data: Dict[str, float]
    image_base64: Optional[str] = None


class AnalysisResponse(BaseModel):
    alert: Alert
    processing_time_ms: float
    xgboost_active: bool = False        # lets frontend show "Real XGBoost" badge


# ── WebSocket ────────────────────────────────────────────────────────────────

class WSMessage(BaseModel):
    type: Literal["alert", "sensor_update", "risk_update", "action_update"]
    payload: Dict[str, Any]
    timestamp: datetime
