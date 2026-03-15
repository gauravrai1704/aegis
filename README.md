# Aegis-X 
### XAI-Driven Disaster Command & Decision System

> A Shared Control Model that fuses multi-modal disaster data (IoT sensors, satellite
> imagery, NLP) with a full XAI stack — giving commanders the **why**, the **what-if**,
> the **blind spots**, and the **conflict flags** behind every recommendation, while
> keeping the human commander as the final Verification Gate.

---

## Complete Feature Matrix

| **Layer**     | **Feature**                                                                     |
| ------------- | ------------------------------------------------------------------------------- |
| **AI Core**   | Real XGBoost model (300-sample synthetic training)                              |
| **AI Core**   | Real SHAP via shap.TreeExplainer — completeness axiom guaranteed                |
| **AI Core**   | LBP Texture Pre-Processing (Wiener deblur, Contourlet transform)                |
| **AI Core**   | Dual-Level XAI: Grad-CAM (global) + Saliency Maps (local pixel)                 |
| **XAI**       | Contrastive / Counterfactual Explanations — What-If panel                       |
| **XAI**       | Uncertainty Quantification — Humble AI blind-spot overlay                       |
| **XAI**       | Cross-Modal Conflict Detection — sensor vs visual disagreement                  |
| **XAI**       | Plain-English Reasoning Trace (9-step enriched)                                 |
| **Spread**    | Predictive Spread Model — 1h / 3h / 6h cellular automaton                       |
| **Spread**    | Primary spread corridor identification                                          |
| **Learning**  | Active Learning Loop — override → labeled training sample                       |
| **Learning**  | NLP override reason clustering (5 semantic clusters)                            |
| **Learning**  | Model performance trend with retraining pipeline visualization                  |
| **Learning**  | Commander decision audit log with JSON export                                   |
| **Interface** | 7-panel navigation (Command / Map / Alerts / XAI / Spread / AI Loop / Briefing) |
| **Interface** | Live risk timeline (rolling 30-point average + peak)                            |
| **Interface** | 360° VR Panoramic sensor awareness view                                         |
| **Interface** | Risk Map layer switcher (Risk / Spread / Population / VR)                       |
| **Interface** | Conflict overlays on tactical map                                               |
| **Briefing**  | NATO SMEAC mission briefing auto-generator                                      |
| **Briefing**  | Integrated spread forecast in briefing                                          |
| **Briefing**  | Plain-text export of briefing                                                   |
| **Gate**      | Human Verification Gate (approve / override)                                    |
| **Gate**      | Override reason → Learning Loop pipeline                                        |
| **Gate**      | Sensor fault action injected on conflict detection                              |


---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Aegis-X                                       │
├──────────────────┬─────────────────────────┬────────────────────────────┤
│  Data Sources    │      AI Core            │      User Interface        │
├──────────────────┼─────────────────────────┼────────────────────────────┤
│ IoT Sensors      │ XGBoost Models          │ React Dashboard            │
│ Drone Imagery    │ SHAP TreeExplainer      │ 7 Navigation Panels        │
│ USGS Earthquakes │ LBP Pre-Processor       │ Real-time Risk Map         │
│ NOAA Alerts      │ Counterfactual Engine   │ XAI Explanation Panel      │
│ GDACS Events     │ Uncertainty Quantifier  │ Verification Gate          │
│ NASA FIRMS       │ Conflict Detector       │ Learning Loop Dashboard    │
│                  │ Spread Model            │ Mission Briefing Viewer    │
└──────────────────┴─────────────────────────┴────────────────────────────┘
      FastAPI + Python                                 Vite + React 
                    │                                    │
                    └────────── WebSocket (WSS) ────────┘
```

---

## Local Development

```bash
cd backend

# Create virtual environment (macOS / Linux)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run backend server
uvicorn app.main:app --reload

#Backend API docs will be available at:
# → http://localhost:8000/api/docs

# Frontend
cd frontend && npm install
cp .env.example .env.local && npm run dev

# → http://localhost:5173
```

---

## API Reference 

| **Method** | **Endpoint**                  | **Description**                     |
| ---------- | ----------------------------- | ----------------------------------- |
| GET        | `/health`                     | System health + active feature list |
| GET        | `/api/alerts/`                | Recent alerts with full XAI         |
| POST       | `/api/alerts/generate`        | Trigger AI analysis                 |
| POST       | `/api/alerts/{id}/approve`    | Human Verification Gate — approve   |
| POST       | `/api/alerts/{id}/override`   | Override + feed Learning Loop       |
| GET        | `/api/risk-map/`              | Sector risk zones                   |
| POST       | `/api/analyze/`               | On-demand sector analysis           |
| GET        | `/api/dashboard/stats`        | Live KPIs                           |
| GET        | `/api/dashboard/model-status` | AI component status                 |
| GET        | `/api/learning-loop/summary`  | Active Learning pipeline state      |
| GET        | `/api/learning-loop/audit`    | Commander decision audit log        |
| GET        | `/api/spread/forecast`        | 1h/3h/6h spread prediction          |
| GET        | `/api/briefing/{alert_id}`    | NATO SMEAC mission briefing         |
| WS         | `/ws/stream`                  | Real-time alert + risk stream       |


---

## Project Structure

```
aegis-x/
├── backend/
│   └── app/
│       ├── main.py                    # FastAPI entry, all routers
│       ├── core/config.py             # Settings from env vars
│       ├── models/schemas.py          # All Pydantic models (Gold Edition)
│       ├── services/
│       │   ├── ai_engine.py           # XGBoost+SHAP+LBP+Counterfactuals+Uncertainty+Conflicts+Dual-XAI
│       │   ├── alert_store.py         # Alert state + Learning Loop integration
│       │   ├── learning_loop.py       # Active Learning pipeline + audit log
│       │   ├── spread_model.py        # CA spread forecasting (1h/3h/6h)
│       │   └── briefing_generator.py  # NATO SMEAC briefing generator
│       └── api/routes/
│           ├── alerts.py              # CRUD + approve/override
│           ├── analysis.py            # On-demand analysis
│           ├── risk_map.py            # GeoJSON risk zones
│           ├── dashboard.py           # Stats + model status
│           ├── learning_loop.py       # AI Loop summary + audit
│           ├── spread.py              # Spread forecast
│           ├── briefing.py            # SMEAC briefing
│           └── websocket_handler.py   # Real-time streaming
│
└── frontend/
    └── src/
        ├── App.jsx                    # Root + 7-panel routing
        ├── index.css                  # Design system + animations
        ├── store/aegisStore.js        # Zustand global state
        ├── hooks/useWebSocket.js      # Auto-reconnecting WS
        ├── utils/api.js               # All API calls
        ├── components/
        │   ├── NavBar.jsx             # 7-item nav + WS status
        │   ├── StatsPanel.jsx         # KPI grid + conflict/uncertainty counts
        │   ├── AlertFeed.jsx          # Real-time alert stream
        │   ├── XAIPanel.jsx           # 6-tab XAI panel (Gold Edition)
        │   ├── RiskMap.jsx            # Map + 4 layers + VR panoramic
        │   ├── VerificationGate.jsx   # Approve/Override + Learning Loop
        │   └── Notifications.jsx      # Toast system
        └── pages/
            ├── CommandDashboard.jsx   # Main + risk timeline + model status bar
            ├── LearningLoopPage.jsx   # Active Learning visualization
            ├── SpreadModelPage.jsx    # 1h/3h/6h forecast + spread map
            └── BriefingPage.jsx       # NATO SMEAC briefing viewer

```

---

## References

- Ghaffarian, Taghikhah & Maier (2023) — *IJDRR 98, 104123* 
- Lagap et al. (2025, UCL) — Multihead Attention for structural damage (dual-level XAI recommendation)
- Zhao & Wang (2025, IEEE) — Improved LBP + Contourlet Transform for drone texture extraction

