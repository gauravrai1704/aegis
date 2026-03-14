"""
Aegis-X WebSocket Handler
Real-time streaming of alerts and sensor updates to the frontend dashboard.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import ai_engine, alert_store
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

# Active WebSocket connections
_connections: Set[WebSocket] = set()


async def broadcast(message: dict):
    """Broadcast a message to all connected clients."""
    dead = set()
    for ws in _connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    _connections.add(websocket)
    logger.info(f"WebSocket connected. Total clients: {len(_connections)}")

    try:
        # Send initial risk map immediately
        risks = ai_engine.get_all_sector_risks()
        await websocket.send_json({
            "type": "risk_update",
            "payload": risks,
            "timestamp": datetime.utcnow().isoformat(),
        })

        while True:
            # Generate a new alert on a cadence
            await asyncio.sleep(settings.SIMULATION_INTERVAL)

            # Pick highest-risk sector
            risks = ai_engine.get_all_sector_risks()
            hot_sector = max(risks, key=risks.get)

            if risks[hot_sector] >= settings.RISK_THRESHOLD_LOW:
                alert = ai_engine.generate_alert(sector_id=hot_sector)
                alert_store.store_alert(alert)
                await broadcast({
                    "type": "alert",
                    "payload": alert.model_dump(mode="json"),
                    "timestamp": datetime.utcnow().isoformat(),
                })

            # Also broadcast updated risk map
            await broadcast({
                "type": "risk_update",
                "payload": risks,
                "timestamp": datetime.utcnow().isoformat(),
            })

    except WebSocketDisconnect:
        _connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total clients: {len(_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        _connections.discard(websocket)
